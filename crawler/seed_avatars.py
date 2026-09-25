"""寫入頭像清單 USER/IMG，註冊後的選頭像頁面會讀取它。

用法：python crawler/seed_avatars.py
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore

CRAWLER_DIR = os.path.dirname(os.path.abspath(__file__))
AVATAR_DIR = os.path.join(CRAWLER_DIR, '..', 'static', 'resources', 'avatars')

key_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') or os.path.join(CRAWLER_DIR, '..', 'backend', 'firebase_config2.json')
firebase_admin.initialize_app(credentials.Certificate(key_path))
db = firestore.client()

urls = [f'/static/resources/avatars/{name}' for name in sorted(os.listdir(AVATAR_DIR))]
db.collection('USER').document('IMG').set({'urls': urls})
print(f"{db.project}：已寫入 {len(urls)} 個頭像")
