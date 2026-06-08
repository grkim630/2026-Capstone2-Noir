"""data/noir_color_db.xlsx → data/noir_color_db.json보내기."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from recommendation.recommend import SOURCE_DB_NAME, load_cosmetic_db, resolve_db_path  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = PROJECT_ROOT / "data" / "noir_color_db.json"


def main() -> None:
    db_path = resolve_db_path()
    catalog = load_cosmetic_db(db_path)
    products = catalog["products"]
    eye_palettes = catalog["eyePalettes"]

    counts: dict[str, int] = {}
    for product in products:
        product_type = product["productType"]
        counts[product_type] = counts.get(product_type, 0) + 1
    counts["eye_palette"] = len(eye_palettes)

    payload = {
        "metadata": {
            "sourceFile": SOURCE_DB_NAME,
            "sourcePath": str(db_path),
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "totalProducts": len(products) + len(eye_palettes),
            "flatProductRows": len(products),
            "eyePaletteCount": len(eye_palettes),
            "categoryCounts": counts,
            "eyePaletteShadeKeys": [
                "glitter",
                "base_matt",
                "semi_glitter_matt",
                "blending_matt",
            ],
        },
        "products": products,
        "eyePalettes": eye_palettes,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)

    print(
        f"Exported {len(products)} flat products + {len(eye_palettes)} eye palettes "
        f"to {OUTPUT_PATH}",
    )


if __name__ == "__main__":
    main()
