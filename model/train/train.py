


from torch.utils.data import Dataset, DataLoader
from rnn import RNNVideoClassifier
import torch.nn.functional as F
from PIL import Image
import numpy as np
import torch
import clip
import json 
import sys
import math
import os
import cv2
import time 

device = "cuda" if torch.cuda.is_available() else "cpu"
print(device)
model, preprocess = clip.load("ViT-L/14", device=device)

frame_ps = 8
model_output_name = "rnn_background.pth"
data_path = "nus-basketball-detection-cs5260" # dataset url https://huggingface.co/datasets/linhuaian3/nus-basketball-detection-cs5260

# Custom Dataset for CLIP
class VideoDataset(Dataset):
    def __init__(self, data_path, transform):
        with open(data_path, "r") as f:
            self.data = json.load(f)
        self.transform = transform

    def extract_frame(self, video_path):
        cap = cv2.VideoCapture(video_path)
        frames = []
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_idxs = np.linspace(0, total_frames - 1, frame_ps, dtype=int)
        for idx in frame_idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(frame).convert("RGB")
                frames.append(img)
        cap.release()
        frames = [self.transform(x).to(device) for x in frames]
        frames = torch.stack(frames, dim=0)
        return frames
        
    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        video_path, label = self.data[idx]["video"], self.data[idx]["label"]
        frames = self.extract_frame(os.path.join(data_path, video_path))
        if frames is None:
            return None  # Skip invalid videos
        return frames, torch.tensor(label, dtype=torch.long)

# Load data
def custom_collate(batch):
    videos, labels = zip(*batch)  # unzip into separate lists
    videos = torch.stack(videos, dim=0)  # shape: [4, 5, 3, 224, 224]
    labels = torch.tensor(labels)       # convert labels to tensor (if scalar)
    return videos, labels

train_dataset = VideoDataset(f"{data_path}/train_data.json", preprocess)
test_dataset = VideoDataset(f"{data_path}/test_data.json", preprocess)

train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True, collate_fn=custom_collate)
test_loader = DataLoader(test_dataset, batch_size=8, shuffle=False, collate_fn=custom_collate)

    
classifier = RNNVideoClassifier().to(device)
optimizer = torch.optim.Adam(classifier.parameters(), lr=1e-4)
criterion = torch.nn.CrossEntropyLoss()

# -------------------------
# Training Loop
# -------------------------
for epoch in range(60):
    model.eval()
    classifier.train()
    
    total_loss = 0
    for frames, labels in train_loader:
        frames, labels = frames, labels.to(device)
        with torch.no_grad():
            features = [] 
            for frame in frames:
                temp_features = model.encode_image(frame).to(torch.float32)
                features.append(temp_features)
            features = torch.stack(features, dim=0)
        outputs = classifier(features)
        loss = criterion(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
    print(f"Epoch {epoch+1}, Loss: {total_loss / len(train_loader)}")
torch.save(classifier, model_output_name)


# -------------------------
# Evaluation / Testing Loop
# -------------------------
classifier = torch.load(model_output_name, weights_only=False)

correct = 0
total = 0
classifier.eval()
pred = []
truth = []
with torch.no_grad():
    t1 = time.time()
    for frames, labels in test_loader:

        frames, labels = frames, labels.to(device)
        with torch.no_grad():
            features = [] 
            for frame in frames:
                temp_features = model.encode_image(frame).to(torch.float32)
                features.append(temp_features)
            features = torch.stack(features, dim=0)
        outputs = classifier(features)
        predictions = torch.argmax(outputs, dim=1)
        correct += (predictions == labels).sum().item()
        total += labels.size(0)

        pred.extend(list(predictions))
        truth.extend(list(labels))

    print(f"Average took {(time.time() - t1)/(total):.2f} seconds to process one frame")

pred = [x.item() for x in pred]
truth = [x.item() for x in truth]

arr = []
for p, t in zip(pred, truth):
    if p != t:
        arr.append(f"Predicted {t} as {p}")

from collections import Counter
counter = Counter(arr)
for num, count in counter.items():
    print(f"{num}: {count}")

print(f"Accuracy: {correct / total:.2%}")