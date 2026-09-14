# SMD 學習平台

SMD 是一套以 Flask 與 Firebase Firestore 打造的線上題庫與測驗平台，作為資料庫課程的期末專案。使用者可以註冊帳號、依科目與章節練習選擇題、把不熟的題目加星號、查看自己的作答歷程，並建立只屬於自己的私人題庫。

> 專案最初版本的 README 已移至 [docs/README-original.md](docs/README-original.md)，其中包含當時的待辦清單與原始說明。

---

## 主要功能

- **帳號系統**：以 Flask-Login 管理登入狀態，密碼使用 bcrypt 雜湊後存入 Firestore；支援註冊、選擇頭像、修改個人資料與密碼、刪除帳號。
- **公開題庫**：所有人共用的科目與章節題目，存放在 Firestore 的 `SUBJECTS` 集合。
- **私人題庫**：每位使用者可以自行新增科目、章節與題目，存放在自己的 `USER/{uid}/SUBJECTS` 之下，在題庫列表中會與公開題庫合併顯示。
- **星號標記**：把想複習的題目標記起來，記錄在 `USER/{uid}/STARS`。
- **作答歷程**：每題累計作答次數與答對次數，記錄在 `USER/{uid}/HIST`。
- **測驗紀錄**：完成一次測驗後保存日期、正確率與題目清單，可回頭查看該次測驗的完整題目與當時狀態。
- **Wordle 小遊戲**：附帶的單字猜謎頁面。
- **Notion 題庫爬蟲**：把從 Notion 匯出的 HTML 題目批次寫入 Firestore。

## 技術架構

| 層級 | 使用技術 |
| --- | --- |
| 後端 | Python、Flask、Flask-Login |
| 資料庫 | Firebase Firestore（透過 `firebase-admin`） |
| 密碼保護 | bcrypt |
| 前端 | 原生 HTML / CSS / JavaScript，Jinja2 樣板 |
| 爬蟲 | BeautifulSoup 4 |

前端沒有使用任何框架或打包工具，所有頁面都由 Flask 以 Jinja2 直接算繪，靜態檔案則由 Flask 的 static 目錄提供。

## 目錄結構

```
SMD_Database_Project/
├── backend/
│   ├── app.py                  # Flask 應用程式，所有路由與 Firestore 存取
│   ├── t.py                    # 手動測試 Firestore 查詢的暫存腳本
│   ├── 參考                     # 各 API 的前端呼叫範例
│   ├── 返回的json的格式.json      # get_questions 回傳格式範例
│   └── firebase_config2.json   # Firebase 服務帳戶金鑰（未納入版控）
├── crawler/
│   ├── crawl_notion.py         # 解析 Notion 匯出的 HTML 並寫入 Firestore
│   └── ch*.html                # 各章節的題目原始檔
├── static/
│   ├── html/                   # Jinja2 樣板，base.html 為共用外框
│   ├── css/                    # 各頁面對應的樣式表
│   ├── js/                     # 各頁面對應的前端邏輯
│   ├── resources/              # 科目封面圖等前端圖片
│   └── sound/                  # 答對與答錯音效
├── resources/                  # 網站圖示與說明文件用圖
├── docs/
│   └── README-original.md      # 專案最初版本的 README
├── requirements.txt
└── README.md
```

## 環境準備

### 1. 安裝套件

```bash
pip install -r requirements.txt
```

爬蟲另外需要 BeautifulSoup，尚未列入 `requirements.txt`：

```bash
pip install beautifulsoup4
```

### 2. 放入 Firebase 金鑰

`app.py` 會讀取 `backend/firebase_config2.json` 作為 Firebase 服務帳戶金鑰。這個檔案含有機密資訊，已被 `.gitignore` 排除，必須自行從 Firebase 主控台下載後放到該路徑。缺少金鑰時應用程式仍會啟動，但終端機會印出初始化錯誤，而且所有資料庫操作都會失敗。

## 啟動方式

```bash
python backend/app.py
```

請從專案根目錄執行，因為金鑰路徑與樣板路徑都是相對於根目錄。啟動後在終端機按住 `Ctrl` 並點擊網址即可開啟，預設監聽 `0.0.0.0:8787`，同網段的其他裝置也能連入。按 `Ctrl + C` 結束。

![啟動畫面](resources/image.png)

## 資料模型

Firestore 採用集合與文件交錯的巢狀結構。

### 公開題庫

```
SUBJECTS/{subject_id}/{unit_id}/{question_id}
SUBJECTS/{subject_id}/{unit_id}/meta        # { examtype, owner }
```

題目文件的欄位為 `Q`（題目）、`A`（答案）與 `O1` 到 `O5`（選項）。每個章節的 `meta` 文件記錄考試範圍與擁有者，不會被當成題目讀取。

### 使用者資料

```
USER/{uid}                                          # UserName, email, password, major, grade, img
USER/{uid}/SUBJECTS/{subject_id}/{unit_id}/{qid}    # 私人題庫，結構同公開題庫
USER/{uid}/STARS/{subject_id}/{unit_id}/{qid}       # { star: bool }
USER/{uid}/HIST/{subject_id}/{unit_id}/{qid}        # { answer: int, correct: int }
USER/{uid}/TEST_RECORDS/{record_id}                 # date, accuracy, num, questions
```

另有 `USER/IMG` 這份文件存放可選頭像清單，以及 `CONTACT_US` 集合存放聯絡表單的來信。

讀取題目時，後端會先查公開題庫，找不到才改查該使用者的私人題庫，因此同名科目章節會以公開版本優先。

## 路由一覽

### 頁面

| 路由 | 說明 | 需登入 |
| --- | --- | --- |
| `/` | 首頁 | 否 |
| `/login`、`/register`、`/choose_avatar` | 登入、註冊、選擇頭像 | 否 |
| `/about-us`、`/contact-us`、`/privacy`、`/terms` | 靜態頁面與聯絡表單 | 否 |
| `/sets` | 題庫列表，合併顯示公開與私人科目 | 是 |
| `/chapter` | 單一章節的題目瀏覽與編輯 | 是 |
| `/practice` | 練習模式 | 是 |
| `/test_record` | 測驗紀錄列表 | 是 |
| `/settings` | 個人資料、密碼、刪除帳號 | 是 |
| `/upgrade` | 升級 premium 的介紹頁 | 是 |
| `/wordle` | Wordle 小遊戲 | 是 |
| `/logout` | 登出 | 是 |

### JSON API

所有 API 都以 `POST` 搭配 JSON 主體呼叫，且都需要登入。

| 端點 | 用途 |
| --- | --- |
| `/get_questions` | 一次取得多個科目章節的題目，附帶星號與作答歷程 |
| `/get_private` | 取得目前使用者的私人題庫清單 |
| `/add_subject`、`/delete_subject` | 新增或刪除私人科目 |
| `/add_unit`、`/delete_unit` | 新增或刪除章節 |
| `/add_question`、`/delete_question` | 新增或刪除題目 |
| `/update_star` | 切換單題的星號狀態 |
| `/update_hist` | 批次累加多題的作答與答對次數 |
| `/add_test_record` | 保存一次測驗結果 |
| `/get_test_record` | 取得所有測驗紀錄摘要 |
| `/get_test_record_detail` | 依 `record_id` 取回該次測驗的完整題目 |
| `/refresh_chapter_temp_mem` | 更新章節頁面的伺服器端暫存 |
| `/get_img` | 取得可選頭像清單 |

每個端點的請求與回應範例集中在 [backend/參考](backend/參考)，`/get_questions` 的完整回傳格式另外收錄在 [backend/返回的json的格式.json](backend/返回的json的格式.json)。

## 題庫爬蟲

`crawler/crawl_notion.py` 會讀取同目錄下的 `ch{章節}.html`，用 BeautifulSoup 解析 Notion 的摺疊區塊，抽出題目、五個選項與答案，再寫入 Firestore。

執行前需要留意三件事。腳本以相對路徑 `../backend/firebase_config2.json` 讀取金鑰，所以必須在 `crawler/` 目錄下執行。目標科目在程式中寫死為 `MACROECONOMICS`，換科目要直接改原始碼。檔案結尾的 `chapters` 清單被指派了兩次，實際只有第二次的值會生效。

```bash
cd crawler
python crawl_notion.py
```

## 已知問題與後續工作

- `chapter_temp_mem` 是模組層級的全域變數，所有使用者共用同一份暫存，多人同時操作會互相覆蓋。
- `app.secret_key` 直接寫死在原始碼中，正式部署前應改為從環境變數讀取。
- `app.run` 以 `debug=True` 啟動並綁定 `0.0.0.0`，僅適合開發環境使用。
- 刪除帳號只移除 `USER` 的主文件，底下的子集合不會一併清除。
- `crawler/` 需要的 `beautifulsoup4` 尚未加入 `requirements.txt`。
- `wordle_尚未放入SMD/` 內的音效檔尚未整併進主專案。

原始的功能待辦清單保留在 [docs/README-original.md](docs/README-original.md)。
