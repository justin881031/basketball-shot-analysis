import json

class Record:

    def __init__(self, out_json_name): 
        self.out_json_name = out_json_name
        self.label_map = {
            "freethrow_miss": 0,
            "freethrow_make": 1,
            "threepoint_miss": 2,
            "threepoint_make": 3,
            "layup_miss": 4,
            "layup_make": 5,
            "dunk_miss": 6,
            "dunk_make": 7,
            "midrange_make": 8, 
            "midrange_miss": 9,
            "background": 10
        }
        self.data = {
                "freeThrow":   {"made": 0, "missed": 0},
                "layup":       {"made": 0, "missed": 0},
                "midrange":    {"made": 0, "missed": 0},
                "threePoint":  {"made": 0, "missed": 0},
                "dunk":        {"made": 0, "missed": 0},
                "shotList":    [],
                "complete":    False,
            }
        self.shot_id = 1


    def add_data(self, cls, ts):
        if cls == 0:
            self.data["freeThrow"]["missed"]+= 1
            shot = {"id": self.shot_id,  "type": "Free Throw", "made": False,  "timestamp": ts}
            self.data["shotList"].append(shot)
        elif cls == 1:
            self.data["freeThrow"]["made"]+= 1
            shot = {"id": self.shot_id,  "type": "Free Throw", "made": True,  "timestamp": ts}
            self.data["shotList"].append(shot)

        elif cls == 2:
            self.data["threePoint"]["missed"]+= 1
            shot = {"id": self.shot_id,  "type": "3PT", "made": False,  "timestamp": ts}
            self.data["shotList"].append(shot)
        elif cls == 3:
            self.data["threePoint"]["made"]+= 1
            shot = {"id": self.shot_id,  "type": "3PT", "made": True,  "timestamp": ts}
            self.data["shotList"].append(shot)

        elif cls == 4:
            self.data["layup"]["missed"]+= 1
            shot = {"id": self.shot_id,  "type": "Layup", "made": False,  "timestamp": ts}
            self.data["shotList"].append(shot)
        elif cls == 5:
            self.data["layup"]["made"]+= 1
            shot = {"id": self.shot_id,  "type": "Layup", "made": True,  "timestamp": ts}
            self.data["shotList"].append(shot)
            
        elif cls == 6:
            self.data["dunk"]["missed"]+= 1
            shot = {"id": self.shot_id,  "type": "Dunk", "made": False,  "timestamp": ts}
            self.data["shotList"].append(shot)
        elif cls == 7:
            self.data["dunk"]["made"]+= 1
            shot = {"id": self.shot_id,  "type": "Dunk", "made": True,  "timestamp": ts}
            self.data["shotList"].append(shot)
            
        elif cls == 9:
            self.data["midrange"]["missed"]+= 1
            shot = {"id": self.shot_id,  "type": "Midrange", "made": False,  "timestamp": ts}
            self.data["shotList"].append(shot)
        elif cls == 8:
            self.data["midrange"]["made"]+= 1
            shot = {"id": self.shot_id,  "type": "Midrange", "made": True,  "timestamp": ts}
            self.data["shotList"].append(shot)
        self.shot_id += 1

    def complete(self):
        self.data["complete"] = True
        
    def out(self):
        with open(self.out_json_name, 'w') as f:
            json.dump(self.data, f, indent=4)