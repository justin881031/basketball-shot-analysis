from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
from flask_cors import CORS
import threading
import json
import time

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])


# Make a 'video' folder next to this script
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "video")
os.makedirs(UPLOAD_DIR, exist_ok=True)

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)


def analysis_task(video_path: str, json_path: str):
    """
    Runs your shot-detection model on `video_path` and writes out
    intermediate & final results to `json_path`.
    """
    # Start with an empty structure
    data = {
        "freeThrow":   {"made": 0, "missed": 0},
        "layup":       {"made": 0, "missed": 0},
        "midrange":    {"made": 0, "missed": 0},
        "threePoint":  {"made": 0, "missed": 0},
        "dunk":        {"made": 0, "missed": 0},
        "shotList":    [],
        "complete":    False,
    }
    # Write initial empty file
    with open(json_path, "w") as jf:
        json.dump(data, jf)

    types = ["Free Throw", "Layup", "Midrange", "3PT", "Dunk"]
    dummy_events = []
    for i in range(1, 31):
        sec = i * 5
        minutes = sec // 60
        seconds = sec % 60
        dummy_events.append({
            "id": i,
            "type": types[(i-1) % len(types)],
            "made": (i % 2 == 0),  # even IDs made, odd missed
            "timestamp": f"{minutes}:{seconds:02d}",
        })

    cat_map = {
        "Free Throw": "freeThrow",
        "Layup":      "layup",
        "Midrange":   "midrange",
        "3PT":        "threePoint",
        "Dunk":       "dunk",
    }

    for ev in dummy_events:
        # simulate analysis delay
        time.sleep(1)

        # update aggregates
        key = cat_map.get(ev["type"])
        if key is None:
            continue
        field = "made" if ev["made"] else "missed"
        data[key][field] += 1

        data["shotList"].append(ev)

        # write incremental update
        with open(json_path, "w") as jf:
            json.dump(data, jf)

    # finally mark complete
    data["complete"] = True
    with open(json_path, "w") as jf:
        json.dump(data, jf)



@app.route("/upload", methods=["POST"])
def upload_video():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "no file part"}), 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(UPLOAD_DIR, filename)
    file.save(save_path)

    json_name = filename + ".json"
    json_path = os.path.join(RESULTS_DIR, json_name)
    with open(json_path, "w") as jf:
        json.dump({
            "freeThrow":   {"made": 0, "missed": 0},
            "layup":       {"made": 0, "missed": 0},
            "midrange":    {"made": 0, "missed": 0},
            "threePoint":  {"made": 0, "missed": 0},
            "dunk":        {"made": 0, "missed": 0},
            "shotList":    [],
            "complete":    False,
        }, jf)

    # Spawn the background thread
    thread = threading.Thread(
        target=analysis_task,
        args=(save_path, json_path),
        daemon=True
    )
    thread.start()

    return jsonify({"message": "saved", "path": save_path}), 200


@app.route("/videos", methods=["GET"])
def list_videos():
    try:
        files = os.listdir(UPLOAD_DIR)
    except FileNotFoundError:
        files = []
    # optionally filter to only video extensions:
    vids = [f for f in files if f.lower().endswith((".mp4", ".mov", ".webm", ".mkv"))]
    return jsonify(vids)


@app.route("/video/<path:filename>")
def serve_video(filename):
    # streams the file back so your front-end can <video src=…>
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/analyze", methods=["GET", "POST"])
def analyze_video():
    # data = request.get_json()
    # filename = secure_filename(data.get("filename", ""))
    # video_path = os.path.join(UPLOAD_DIR, filename)

    # # now you can open video_path and run your analysis model on it
    # # e.g. results = run_shot_detection(video_path)

    # fake_results = {
    #     "freeThrow":   {"made": 5, "missed": 1},
    #     "layup":       {"made": 3, "missed": 2},
    #     "midrange":    {"made": 4, "missed": 3},
    #     "threePoint":  {"made": 3, "missed": 2},
    #     "dunk":        {"made": 2, "missed": 0},
    #     "shotList": [
    #         {"id": 1,  "type": "3PT",        "made": True,  "timestamp": "0:05"},
    #         {"id": 2,  "type": "Layup",      "made": False, "timestamp": "0:12"},
    #         {"id": 3,  "type": "Midrange",   "made": False, "timestamp": "0:18"},
    #         {"id": 4,  "type": "Free Throw", "made": True,  "timestamp": "0:25"},
    #         {"id": 5,  "type": "3PT",        "made": True,  "timestamp": "0:32"},
    #         {"id": 6,  "type": "Dunk",       "made": True,  "timestamp": "0:40"},
    #     ]
    # }
    # return jsonify(fake_results)

    if request.method == "POST":
        data = request.get_json() or {}
        filename = secure_filename(data.get("filename", ""))
    else:
        filename = secure_filename(request.args.get("filename", "") or "")

    json_name = filename + ".json"
    json_path = os.path.join(RESULTS_DIR, json_name)

    if not os.path.exists(json_path):
        return jsonify({"error": "results not found"}), 404

    with open(json_path, "r") as jf:
        payload = json.load(jf)
    return jsonify(payload)

if __name__ == "__main__":
    app.run(debug=True)