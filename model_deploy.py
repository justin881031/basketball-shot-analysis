import torch 
import torch.nn as nn 
import torch
import clip
import cv2
import numpy as np
from PIL import Image
from model.data import Record
import torch.nn.functional as F

class RNNVideoClassifier(nn.Module):
    def __init__(self, input_dim=512, hidden_dim=1024, num_layers=2, num_classes=11, dropout_prob=0.3):
        super().__init__()
        self.rnn = nn.GRU(input_dim, hidden_dim, num_layers, batch_first=True, dropout=dropout_prob)

        self.norm = nn.LayerNorm(hidden_dim)
        self.dropout = nn.Dropout(dropout_prob)

        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 512),
            nn.LayerNorm(512),
            nn.ReLU(),
            nn.Dropout(dropout_prob),

            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.ReLU(),
            nn.Dropout(dropout_prob),

            nn.Linear(256, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Dropout(dropout_prob),

            nn.Linear(128, 64),
            nn.LayerNorm(64),
            nn.ReLU(),
            nn.Dropout(dropout_prob),

            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        # x: (batch_size, seq_len=20, input_dim=512)
        _, hidden = self.rnn(x)  # hidden: (num_layers, batch, hidden_dim)
        out = hidden[-1]         # Take the last layer's hidden state
        out = self.norm(out)     # Normalize hidden state
        out = self.dropout(out)  # Apply dropout before FC
        return self.fc(out)

def format_time_hhmmss(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def process_frame(frame, preprocess, device):
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(frame).convert("RGB")
    img = preprocess(img).unsqueeze(0).to(device)  # (1, 3, 224, 224)
    return img

def encode_clip(frame_tensor, clip_model, bball_game_norm):
    with torch.no_grad():
        feature = clip_model.encode_image(frame_tensor).float()  # (1, 512)
        image_norm =  F.normalize(feature, dim=-1) # shape [1, 512]
        is_game_prob = image_norm @ bball_game_norm.T  # shape [1, 2]
        # print(is_game_prob)
        best_idx = is_game_prob.argmax(dim=1) # shape [1]
    return feature.squeeze(0), best_idx.item()  # (512,)

def predict_clip_rnn(feature_sequence, classifier):
    """ feature_sequence shape: (1, 8, 512) """
    with torch.no_grad():
        outputs = classifier(feature_sequence)  # (1, num_classes)
        # probs = torch.softmax(outputs, dim=1)
    return outputs

def initiate_clip(device):
    clip_model, preprocess = clip.load("ViT-B/32", device=device)
    prompts = [
        "Indoor basketball court", 
        "Basketball match in progress",
        "Active basketball gameplay",
        "Players shooting basketball",
        "Players dribbling basketball",
        "Basketball players running",
        "Basketball players defending",
        "Basketball players rebounding",
        "Free throw shot in basketball",

        "Aerial city view at night", 
        "Outdoor sports stadium",
        "Fans in stadium seats",
        "Camera showing city skyline",
        "Coach giving timeout instructions",
        "Studio desk with sports anchors",
        "Player being interviewed",
        "Cheerleader performance",
        "Aerial view of stadium at night",
        "Sponsor ad during basketball game"
        ]
    bball_game_prompt = clip.tokenize(prompts).to(device)
    bball_game_norm = F.normalize(clip_model.encode_text(bball_game_prompt).to(torch.float32), dim=-1)
    return clip_model, preprocess, bball_game_norm

def run_inference_sliding(classifier, device, video_path, out_json_path, threshold=0.3):
    clip_model, preprocess, bball_game_norm = initiate_clip(device)
    record = Record(out_json_path)
    class_map = dict([(v, k) for k, v in record.label_map.items()])
    cap = cv2.VideoCapture(video_path)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    fps = cap.get(cv2.CAP_PROP_FPS)
    print("Video FPS:", fps, "Total Frames:", total_frames)


    features_list = []  # list to hold last 8 frame features
    game_prob_list = []
    prev_prob = 0

    scoring_events = []

    frame_ps = fps
    frame_idxs = np.linspace(0, total_frames - 1, int(total_frames//frame_ps), dtype=int)

    i = 0
    while i < len(frame_idxs):
        # while len(features_list) < 8 and i < len(frame_idxs):
        idx = frame_idxs[i]
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        _, frame = cap.read()
        frame_tensor = process_frame(frame, preprocess, device)
        feature, is_game_prob = encode_clip(frame_tensor, clip_model, bball_game_norm)
        features_list.append(feature) 
        game_prob_list.append(is_game_prob)
            # print(game_prob_list)
            #i += 1

        features_tensor = torch.stack(features_list).unsqueeze(0)  # shape: (1, 8, 512)
        probs = predict_clip_rnn(features_tensor, classifier)
        max_prob, pred_class = torch.max(probs, dim=1)
        max_prob_value = max_prob.item()

        pred = pred_class.item()
        print(pred, max_prob_value, features_tensor.shape[1], prev_prob, format_time_hhmmss(idx // int(fps)))
        if len(features_list) >= 8:
            ts = format_time_hhmmss(idx // int(fps))
            print(f"Class : {class_map[pred]} detected at {ts} with probs {max_prob_value}!")

            record.add_data(pred, ts)
            record.out()

            scoring_events.append(idx // int(fps))
            features_list = []
            game_prob_list = []
            
        # elif features_tensor.shape[1] >= 32:
        #     features_list.pop(0)
        #     game_prob_list.pop(0)

        i += 1
        prev_prob = max_prob_value

    cap.release()
    record.complete()
    return scoring_events

if __name__ == "__main__":
    video_path = "model/test_video.mp4"
    json_path = "model/test_video.json"
    model_name = "model/rnn_background.pth"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    classifier = torch.load(model_name, map_location=device)
    classifier.eval()
    events = run_inference_sliding(classifier, device, video_path, json_path, threshold=0.6)

    print("Scoring events detected at seconds:", events)
