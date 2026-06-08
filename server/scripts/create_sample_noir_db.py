"""개발용 샘플 noir_color_db.xlsx 생성 (실제 DB 배포 전 테스트용)."""

from pathlib import Path

from openpyxl import Workbook

HEADERS = [
    "Product Type",
    "ID",
    "Name",
    "HEX",
    "RGB",
    "Personal Color (8 Types)",
]

ROWS = [
    ("lip", 1, "sakura", "#F2C6D0", "(242, 198, 208)", "spring_light"),
    ("lip", 2, "sequence", "#C78B7F", "(199, 139, 127)", "spring_light"),
    ("lip", 3, "sugar", "#E8B4C4", "(232, 180, 196)", "spring_bright"),
    ("lip", 4, "vine", "#8F4D5C", "(143, 77, 92)", "autumn_deep"),
    ("lip", 5, "rosewood", "#A86B72", "(168, 107, 114)", "summer_muted"),
    ("lip", 6, "berry", "#7A3D52", "(122, 61, 82)", "winter_deep"),
    ("blush", 1, "joyful", "#E8A8A0", "(232, 168, 160)", "spring_light"),
    ("blush", 2, "viola", "#C9A0B8", "(201, 160, 184)", "summer_light"),
    ("blush", 3, "emberly", "#B898C8", "(184, 152, 200)", "summer_muted"),
    ("blush", 4, "lilium", "#D8A0A8", "(216, 160, 168)", "spring_bright"),
    ("blush", 5, "terra", "#B08070", "(176, 128, 112)", "autumn_muted"),
    ("blush", 6, "mauve", "#9A7888", "(154, 120, 136)", "winter_deep"),
    ("eye_palette", 1, "Fairy Pink", "#E8B8C8", "(232, 184, 200)", "spring_light"),
    ("eye_palette", 2, "Mood Brown", "#9A7A68", "(154, 122, 104)", "autumn_deep"),
    ("eye_palette", 3, "Cool Mauve", "#A890A8", "(168, 144, 168)", "winter_bright"),
]


def main() -> None:
    output = Path(__file__).resolve().parents[2] / "data" / "noir_color_db.xlsx"
    output.parent.mkdir(parents=True, exist_ok=True)

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "products"
    sheet.append(HEADERS)
    for row in ROWS:
        sheet.append(list(row))
    workbook.save(output)
    print(f"Created sample DB: {output}")


if __name__ == "__main__":
    main()
