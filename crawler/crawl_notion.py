"""解析 Notion 匯出的題目 HTML，寫入 Firestore 的公開題庫 SUBJECTS。

用法（從任何目錄執行皆可）：
    python crawler/crawl_notion.py            # 試跑：只解析並統計，不寫入
    python crawler/crawl_notion.py --apply    # 寫入 Firestore

金鑰來源與 app.py 相同：GOOGLE_APPLICATION_CREDENTIALS 或 backend/firebase_config2.json。
"""
import os
import re
import sys
from bs4 import BeautifulSoup

CRAWLER_DIR = os.path.dirname(os.path.abspath(__file__))

# 科目 → 章節（對應 crawler/ch{章節}.html）
SUBJECT_CHAPTERS = {
    'MANAGEMENT': [8, 9, 11, 14, 16, 17, 18],
    'MACROECONOMICS': [202201, 202301, 202302, 202501],
}

LETTERS = 'ABCDE'


def option_marker(letter):
    # 符合 "A) " 或 "(A) "，且必須出現在行首或空白之後，避免誤判題目內文
    return re.compile(r'(?:^|(?<=\s))\(?' + letter + r'\)\s*')


def split_question(text):
    """把「題目 + A)… B)…」拆成題目與選項清單，依序尋找 A、B、C… 的標記。"""
    positions = []
    start = 0
    for letter in LETTERS:
        m = option_marker(letter).search(text, start)
        if not m:
            break
        positions.append(m)
        start = m.end()

    if not positions:
        return text.strip(), []

    question = text[:positions[0].start()].strip()
    options = []
    for i, m in enumerate(positions):
        end = positions[i + 1].start() if i + 1 < len(positions) else len(text)
        options.append(text[m.end():end].strip())
    return question, options


def normalize_answer(answer):
    # "(C) xxx" → "C) xxx"，與網站新增題目時的格式一致
    return re.sub(r'^\(([A-E])\)\s*', r'\1) ', answer.strip())


def parse_notion_quiz_html(html_content):
    """回傳題目清單，每題為 {"Q", "O1".."O5", "A"}，沒有的選項不會出現。"""
    soup = BeautifulSoup(html_content, 'html.parser')
    quiz_data = []

    for block in soup.find_all('div', class_='notion-selectable notion-toggle-block'):
        # 摺疊塊內第一個葉節點是題目與選項，第二個是答案
        content_divs = block.find_all('div', {'contenteditable': 'false', 'data-content-editable-leaf': 'true'})
        if len(content_divs) < 2:
            continue

        question, options = split_question(content_divs[0].get_text(strip=True))
        item = {'Q': ' '.join(question.split())}
        for i, option in enumerate(options):
            item[f'O{i + 1}'] = f"{LETTERS[i]}) {' '.join(option.split())}"
        item['A'] = ' '.join(normalize_answer(content_divs[1].get_text(strip=True)).split())
        quiz_data.append(item)

    return quiz_data


def main():
    apply = '--apply' in sys.argv

    parsed = {}
    for subject_id, chapters in SUBJECT_CHAPTERS.items():
        for ch in chapters:
            with open(os.path.join(CRAWLER_DIR, f'ch{ch}.html'), encoding='utf-8') as f:
                items = parse_notion_quiz_html(f.read())
            parsed[(subject_id, f'ch{ch}')] = items
            short = sum(len([k for k in item if k.startswith('O')]) < 4 for item in items)
            print(f"{subject_id}/ch{ch}: {len(items)} 題" + (f"（{short} 題選項少於 4 個）" if short else ''))

    if not apply:
        print('試跑完成，加上 --apply 才會寫入 Firestore')
        return

    import firebase_admin
    from firebase_admin import credentials, firestore

    key_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') or os.path.join(CRAWLER_DIR, '..', 'backend', 'firebase_config2.json')
    firebase_admin.initialize_app(credentials.Certificate(key_path))
    db = firestore.client()
    print(f"寫入專案：{db.project}")

    for subject_id in SUBJECT_CHAPTERS:
        # 科目文件本身必須存在，題庫列表才會列出這個科目
        db.collection('SUBJECTS').document(subject_id).set({'created_at': firestore.SERVER_TIMESTAMP}, merge=True)

    for (subject_id, unit_id), items in parsed.items():
        unit_ref = db.collection('SUBJECTS').document(subject_id).collection(unit_id)
        batch = db.batch()
        batch.set(unit_ref.document('meta'), {'owner': 'public'})
        for i, item in enumerate(items):
            batch.set(unit_ref.document(str(i + 1)), item)
        batch.commit()
        print(f"{subject_id}/{unit_id} 完成")


if __name__ == '__main__':
    main()
