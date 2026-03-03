import os
import requests
import json

SUPABASE_URL = "https://roblysrdqxelsxyypqlh.supabase.co"
SUPABASE_KEY = "sb_publishable_yzb_Ms5J450ZG44uQ1zOzw_j67Fv1Lp"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def upload_photo(data):

    url = f"{SUPABASE_URL}/rest/v1/photos"

    requests.post(url, headers=headers, data=json.dumps(data))

IMAGE_FOLDER = "output"

for file in os.listdir(IMAGE_FOLDER):

    if not file.endswith((".jpg", ".png", ".jpeg")):
        continue

    upload_photo({
        "title": file,
        "image_url": f"/storage/{file}",
        "location": "西安",
        "shoot_time": "2025-05-01",
        "description": "这是描述",
        "params": "Nikon Z30 with Nikkor Z DX 50-250mm",
        "like_count": 0
    })