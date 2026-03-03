import os
from PIL import Image
from tqdm import tqdm

INPUT_DIR = "input"
OUTPUT_DIR = "output"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def compress_image(path, output_path):

    img = Image.open(path)

    # 保持摄影作品质量
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # 最大宽度 2000（摄影官网推荐）
    max_width = 2000

    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    img.save(output_path, optimize=True, quality=88)

for file in tqdm(os.listdir(INPUT_DIR)):

    if file.lower().endswith((".jpg", ".jpeg", ".png")):

        compress_image(
            os.path.join(INPUT_DIR, file),
            os.path.join(OUTPUT_DIR, file)
        )