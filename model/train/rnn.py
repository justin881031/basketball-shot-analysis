import torch.nn as nn 

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
        _, hidden = self.rnn(x)  # hidden: (num_layers, batch, hidden_dim)
        out = hidden[-1]         # Take the last layer's hidden state
        out = self.norm(out)     # Normalize hidden state
        out = self.dropout(out)  # Apply dropout before FC
        return self.fc(out)