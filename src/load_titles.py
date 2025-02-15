import os
import json
import xml.etree.ElementTree as ET

def load_titles():
    filename = "titles.json"

    if os.path.exists(filename):
        with open(filename, "r") as f:
            papers_dict = json.load(f)
        print(f"Loaded {filename} into dictionary")
    else:
        papers_dict = {"papers": []}  # Continue with an empty dictionary

    return papers_dict