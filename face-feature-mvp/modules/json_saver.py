import json
from datetime import datetime
from pathlib import Path


def save_result(data, output_dir="outputs", filename=None):
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"face_features_{timestamp}.json"

    file_path = output_path / filename
    with file_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)

    return file_path
