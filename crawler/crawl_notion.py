from bs4 import BeautifulSoup
import re
import firebase_admin
from firebase_admin import credentials, firestore

# 登入資料庫
try:
    cred = credentials.Certificate('../backend/firebase_config2.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    
    
def parse_notion_quiz_html(html_content):
    """
    Returns:
        一個包含測驗資料的列表，每個元素是一個字典，
        包含 'question', 'option1', 'option2', 'option3', 'option4', 'answer' 鍵。
    """

    soup = BeautifulSoup(html_content, 'html.parser')
    quiz_data = []

    # 找到所有可能是題目區塊的摺疊塊
    toggle_blocks = soup.find_all('div', class_='notion-selectable notion-toggle-block')

    for i, block in enumerate(toggle_blocks):
        question_text = "N/A"
        options = ["N/A"] * 5
        answer = "答案未知"

        # 題目和選項通常在摺疊塊內的第一個 contenteditable="false" 的 div 中
        content_divs = block.find_all('div', {'contenteditable': 'false', 'data-content-editable-leaf': 'true'})

        if content_divs:
            # 第一個 div 包含題目和選項
            question_options_text = content_divs[0].get_text(strip=True)

            # 使用正則表達式分割題目和選項
            # 尋找 A) B) C) D) 的模式來分割
            parts = re.split(r'\([A-E]\)', question_options_text)

            

            if len(parts) > 0:
                question_text = parts[0].strip() # 第一部分是題目

                # 後面的部分是選項
                # 確保我們只取前4個可能的部分作為選項
                for j in range(min(len(parts) - 1, 5)):
                     # 重新加上選項的標號 (A) B) C) D)
                    options[j] = f"({chr(65 + j)}) {parts[j+1].strip()}"


            if len(content_divs) > 1:
                 answer_element = content_divs[1]

                 parent_style = answer_element.find_parent(style=lambda value: value and 'display' in value).get('style') if answer_element.find_parent(style=lambda value: value and 'display' in value) else ''
                 if 'display: flex' in parent_style or 'display: block' in parent_style: # 這裡可能需要根據實際HTML調整判斷條件
                      answer = answer_element.get_text(strip=True)


        # 將提取到的資料組織成字典
        quiz_data.append({
            'question': question_text,
            'option1': options[0],
            'option2': options[1],
            'option3': options[2],
            'option4': options[3],
            'option5': options[4],
            'answer': answer
        })

    return quiz_data


def to_database(ch):
    with open(f'ch{ch}.html', 'r', encoding='utf-8') as f:
        html_content = f.read()


    if html_content:
        scraped_data = parse_notion_quiz_html(html_content)

        # 打印提取到的資料（或您可以進一步處理這些資料）
        if scraped_data:
            print("成功提取到測驗資料：")
            # print(scraped_data) # 打印完整的數據結構

            # 為了方便查看，這裡按格式輸出每道題目
            db.collection("SUBJECTS").document("MACROECONOMICS").collection(f"ch{ch}").document("meta").set({"owner" : "public"})
            for i, quiz_item in enumerate(scraped_data):
                db.collection("SUBJECTS").document("MACROECONOMICS").collection(f"ch{ch}").document(f"{i+1}").set({
                    "Q": quiz_item['question'].replace('\n', ' '),
                    "A": quiz_item['answer'].replace('\n', ' '),
                    "O1": quiz_item['option1'].replace('\n', ' '),
                    "O2": quiz_item['option2'].replace('\n', ' '),
                    "O3": quiz_item['option3'].replace('\n', ' '),
                    "O4": quiz_item['option4'].replace('\n', ' '),
                    "O5": quiz_item['option5'].replace('\n', ' ')
                })
                print(f"第 {i+1} 題完成")
        else:
            print("未能從 HTML 內容中提取到測驗資料。請檢查 HTML 結構是否符合預期。")
    else:
        print("無法讀取 HTML 檔案，無法進行爬取。")
        
chapters = [8, 9, 11, 14, 16, 17, 18]
chapters = [202301,202302,202501]

for ch in chapters:
    to_database(ch)
    print(f"第 {ch} 章完成!!")
    print("=========================================")