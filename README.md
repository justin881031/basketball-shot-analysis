# Basketball Shot Analysis

A full‐stack Next.js + Flask app that lets you upload basketball videos, runs shot‐detection in the background, and displays live updating shot statistics and video playback.

## Features

- **Upload** a video via the React UI  
- **Background analysis** (threaded) writes incremental results to a JSON file  
- **Live dashboard** polls every 2 s to show updated shot counts and shot log  
- **Video player** with playback controls and jump-to-shot buttons  
- Supports 5 shot types: Free Throw, Layup, Midrange, 3PT, Dunk  

---

## Prerequisites

- **Node.js** (v16+), **npm** or **yarn** 
- **Python** (3.8+), pip

---

## Getting Started

1. **Clone the repo**  
```bash
   git clone https://github.com/your-username/basketball-shot-analysis.git
   cd basketball-shot-analysis
```

2. **Backend Setup (Flask)**
```bash
    python3 -m venv venv
    source venv/bin/activate      # Mac/Linux
    venv\Scripts\activate         # Windows

    pip install -r requirements.txt
    python backend.py
```
Creates two folders side by side:
* backend/video/ – uploaded videos
* backend/results/ – analysis JSON files
* CORS is already enabled for http://localhost:3000.
* On upload, the server spawns a background thread that writes ```results/<video>.json.```

3. **Frontend Setup (Next.js)**
```bash
    npm install
    npm run dev
```
* Opens on http://localhost:3000.

* Uses React + Next.js App Router with a TabView client component.

* Polls ```http://localhost:5000/analyze?filename=<video>``` every 2s.

## Usage
1. Upload a Video
    * Go to Upload Video tab.
    * Drag-and-drop or browse to select your .mp4, .mov, etc.
    * The upload button sends it to the Flask server, which immediately touches the JSON file and starts analysis.

2. Analyze Shots
    * Select the video to analyze
    * Switch to the Analyze Shots tab.
    * Select your uploaded video from the dropdown.
    * The video player loads ```http://localhost:5000/video/<video>``` and your dashboard fills in live.
    * ⏮️ / ⏭️ buttons jump to the previous/next shot timestamp.

3. Watch Live Updates
    * As the backend thread writes new shots to the JSON, the dashboard and shot log update in real time.
    * When analysis completes ```("complete": true)```, polling stops automatically.