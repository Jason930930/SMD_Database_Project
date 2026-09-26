import os
import secrets
from flask import Flask, render_template, send_file, url_for, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import firebase_admin
from firebase_admin import credentials, firestore
import bcrypt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
IS_PRODUCTION = os.environ.get('APP_ENV') == 'production'

# 登入資料庫
# 有金鑰檔就用金鑰檔；部署在 Google Cloud 上時沒有金鑰檔，改用執行環境的服務帳戶（ADC）
key_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') or os.path.join(BASE_DIR, 'firebase_config2.json')
if os.path.exists(key_path):
    firebase_admin.initialize_app(credentials.Certificate(key_path))
else:
    firebase_admin.initialize_app()
db = firestore.client()


app = Flask(__name__, static_folder=os.path.join(PROJECT_ROOT, 'static'), template_folder=os.path.join(PROJECT_ROOT, 'static', 'html'))

secret_key = os.environ.get('SECRET_KEY')
if not secret_key:
    if IS_PRODUCTION:
        raise RuntimeError('正式環境必須設定 SECRET_KEY 環境變數')
    # 本機開發用隨機金鑰，重新啟動後需要重新登入
    secret_key = secrets.token_hex(32)
app.secret_key = secret_key

app.config.update(
    # Firebase Hosting 轉發請求到 Cloud Run 時只保留名為 __session 的 cookie
    SESSION_COOKIE_NAME='__session',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=IS_PRODUCTION,
    REMEMBER_COOKIE_HTTPONLY=True,
    REMEMBER_COOKIE_SECURE=IS_PRODUCTION,
    # 靜態檔案可由瀏覽器與 CDN 快取一天；網址帶版本號，部署新版時自動更新
    SEND_FILE_MAX_AGE_DEFAULT=86400 if IS_PRODUCTION else None,
)

# 版本號：CI 部署時設定 APP_VERSION（git commit），否則使用 Cloud Run 自動提供的版本名稱
STATIC_VERSION = os.environ.get('APP_VERSION') or os.environ.get('K_REVISION') or 'dev'

@app.url_defaults
def add_static_version(endpoint, values):
    if endpoint == 'static' and 'v' not in values:
        values['v'] = STATIC_VERSION

@app.after_request
def no_cdn_cache_for_pages(response):
    # 頁面與 API 含有個人資料，明確禁止 CDN 快取
    if request.endpoint != 'static':
        response.headers.setdefault('Cache-Control', 'private, no-cache')
    return response

# 設定 Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = "請先登入以訪問此頁面"
login_manager.login_message_category = "warning"

# 用於 Flask-Login 的使用者類別
class User(UserMixin):
    def __init__(self, id, email, username, img):
        self.id = id
        self.email = email
        self.username = username
        self.img = img

@login_manager.user_loader
def load_user(user_id):
    user_data = db.collection('USER').document(user_id).get()
    if user_data.exists:
        data = user_data.to_dict()
        return User(user_id, data['email'], data['UserName'], data['img'])
    return None

@app.route('/favicon.ico')
def my_icon():
    try:
        return send_file(os.path.join(PROJECT_ROOT, 'resources', 'icon.png'), mimetype='image/png')
    except FileNotFoundError:
        print("error")
        return "Icon not found", 404

@app.route('/')
def index():
    return render_template('index.html')

# 驗證使用者
@app.route('/login' , methods=['GET', 'POST'])    
def login():
    if request.method == 'POST':
        result = db.collection("USER").where("email", "==", request.form.get('email')).get()
        if len(result):
            user_data = db.collection('USER').document(result[0].id).get().to_dict()
            if bcrypt.checkpw(request.form.get('password').encode('utf-8'), user_data['password'].encode('utf-8')):
                flask_user = User(result[0].id, user_data['email'], user_data['UserName'], user_data['img'])
                login_user(flask_user)
                next_url = request.args.get('next', '')
                # 只允許站內路徑，避免被當成跳轉到外部網站的跳板
                if next_url.startswith('/') and not next_url.startswith('//'):
                    return redirect(next_url)
                else:   
                    return redirect(url_for('index'))
            else:
                flash('帳號或密碼錯誤', 'danger')
                return redirect(url_for('login'))
        else:
            flash('帳號或密碼錯誤', 'danger')
            return redirect(url_for('login'))
    else:
        return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    user_data = db.collection("USER").document(current_user.id).get().to_dict()
    if request.method == 'POST':
        if request.args.get('type') == 'profile':
            # 更新使用者資料
            db.collection("USER").document(current_user.id).update({
                "UserName": request.form.get('username'),
                "email": request.form.get('email'),
                "major": request.form.get('major'),
                "grade": request.form.get('grade')
            })
            updated_user_data = db.collection("USER").document(current_user.id).get().to_dict()
            flask_user = User(current_user.id, updated_user_data['email'], updated_user_data['UserName'], current_user.img)
            login_user(flask_user)  # 更新 current_user

            flash('資料更新成功', 'success')
            return redirect(url_for('settings'))
        
        elif request.args.get('type') == 'pswd':
            # 更新密碼
            if bcrypt.checkpw(request.form.get('current_password').encode('utf-8'), user_data['password'].encode('utf-8')):
                hashed_password = bcrypt.hashpw(request.form.get('new_password').encode('utf-8'), bcrypt.gensalt())
                db.collection("USER").document(current_user.id).update({
                    "password": hashed_password.decode('utf-8')
                })
                flash('密碼更新成功', 'success')
                return redirect(url_for('settings'))
            else:
                flash('當前密碼錯誤', 'danger')
                return redirect(url_for('settings'))

        elif request.args.get('type') == 'del_account':
            # 刪除使用者帳號
            db.collection("USER").document(current_user.id).delete()
            logout_user()
            flash('帳號已刪除', 'success')
            return redirect(url_for('index'))
        
    return render_template('settings.html', user_data=user_data)

@app.route('/register', methods = ["GET" , "POST"])
def register():
    if request.method == 'POST':
        email_exist = db.collection("USER").where("email", "==", request.form.get('email')).get()
        if len(email_exist):
            flash('此帳號已存在', 'danger')
            return redirect(url_for('register'))
        else:
            hashed_password = bcrypt.hashpw(request.form.get('password').encode('utf-8'), bcrypt.gensalt())
            user_ref = db.collection("USER").add({
                "UserName": request.form.get('username'),
                "email": request.form.get('email'),
                "password": hashed_password.decode('utf-8'),
                "major": request.form.get('major'),
                "grade": request.form.get('grade'),
                "img" : request.form.get('avatar') 
            })
            # return redirect(url_for('login'))
            user_id = user_ref[1].id  # Firestore add() 回傳 (ref, doc)
            # 註冊成功後導向選頭像頁
            return redirect(url_for('choose_avatar', user_id=user_id))
    else:
        return render_template('register.html')
    
@app.route('/about-us')    
def about_us():
    return render_template('about-us.html')

@app.route('/contact-us', methods = ["GET" , "POST"])    
def contact_us():
    if request.method == "POST":
        db.collection("CONTACT_US").add({
            "User_ID" : current_user.id if current_user.is_authenticated else "訪客",
            "Name" : request.form.get('name'),
            "Email" : request.form.get('email'),
            "Subject" : request.form.get('subject'),
            "Message" : request.form.get('message')
        })
        flash('感謝您的聯繫，我們會儘快回覆您！', 'success')
        return redirect(url_for('contact_us'))
    else:
        if "subject" in request.args:
            subject = request.args.get("subject")
        return render_template('contact-us.html', subject=subject if "subject" in locals() else "")

@app.route('/sets')
@login_required
def sets():
    subjects_data = []

    # 根據單元的數字部分來排序資料字典列表
    def sort_key_chapter_number(unit_data_dict):
        unit_id = unit_data_dict["chapter_id"]
        if unit_id.lower().startswith('ch'):
            return int(unit_id[2:])
        elif unit_id.isdigit():
            return int(unit_id)
    
    # public
    subjects_ref = db.collection('SUBJECTS')
    subjects_docs = subjects_ref.get() # 獲取所有科目
    for subject_doc in subjects_docs:
        subject = {"subject_id": subject_doc.id}
    
        unit_collections = subjects_ref.document(subject_doc.id).collections()        
        
        units_data_list = []
        for unit_collection_ref in unit_collections:
            unit_id = unit_collection_ref.id
            meta_doc = unit_collection_ref.document('meta').get()
            size = []
            docs = db.collection("SUBJECTS").document(subject_doc.id).collection(unit_id).stream()
            for doc in docs:
                if doc.id.isdigit():
                    size.append(int(doc.id))

            unit_data = {'chapter_id': unit_id,
                         'size': str(max(size)) + "題" if size else "無題數資訊"}
            
            if meta_doc.exists:
                meta_data = meta_doc.to_dict()
                unit_data.update(meta_data)
            else:
                unit_data['examtype'] = 'unknown'

            units_data_list.append(unit_data) # 將包含 ID 和元數據的字典加入列表

        subject['units'] = sorted(units_data_list, key=sort_key_chapter_number) # 排序list
        subjects_data.append(subject)

    # private
    subjects_docs = db.collection('USER').document(current_user.id).collection('SUBJECTS').get() # 獲取所有科目
    for subject_doc in subjects_docs:
        subject = {"subject_id": subject_doc.id}
    
        unit_collections = db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_doc.id).collections()        
        
        units_data_list = []
        for unit_collection_ref in unit_collections:
            unit_id = unit_collection_ref.id
            meta_doc = unit_collection_ref.document('meta').get()
            size = []
            docs = db.collection("USER").document(current_user.id).collection('SUBJECTS').document(subject_doc.id).collection(unit_id).stream()
            for doc in docs:
                if doc.id.isdigit():
                    size.append(int(doc.id))

            unit_data = {'chapter_id': unit_id,
                         'size': str(max(size)) + "題" if size else "無題數資訊"}
            
            if meta_doc.exists:
                meta_data = meta_doc.to_dict()
                unit_data.update(meta_data)
            else:
                unit_data['examtype'] = 'unknown'

            units_data_list.append(unit_data)
            for subject_data in subjects_data:
                if subject_data['subject_id'] == subject['subject_id']:
                    subject_data['units'].append(unit_data) # 將包含 ID 和元數據的字典加入列表
                    subject_data['units'] = sorted(subject_data['units'], key=sort_key_chapter_number) # 排序list
                    units_data_list.pop() # 移除已經加入的單元資料
                    break

        if units_data_list:
            subject['units'] = sorted(units_data_list, key=sort_key_chapter_number) # 排序list
            subjects_data.append(subject)
            # print(subject)
        else:
            exist = 0 
            for subject_data in subjects_data:
                if subject_data['subject_id'] == subject['subject_id']:
                    exist = 1
                    break
            if not exist:
                subject['units'] = units_data_list
                subjects_data.append(subject)
            
    return render_template('sets.html', subjects=subjects_data)

@app.route('/chapter')
@login_required
def chapter():
    subject_id = request.args.get('subject_id')
    unit_id = request.args.get('unit_id')
    if not subject_id or not unit_id:
        return redirect(url_for('sets'))
    questions = load_unit(subject_id, unit_id)
    return render_template('chapter.html', questions=questions, current_user_id=current_user.id)

@app.route('/get_private')
@login_required
def get_private():
    
    # 根據單元的數字部分來排序資料字典列表
    def sort_key_chapter_number(unit_data_dict):
        unit_id = unit_data_dict["chapter_id"]
        if unit_id.lower().startswith('ch'):
            return int(unit_id[2:])
        elif unit_id.isdigit():
            return int(unit_id)
    
    subjects_data = []
      
    subjects_docs = db.collection('USER').document(current_user.id).collection('SUBJECTS').get() # 獲取所有科目
    
    for subject_doc in subjects_docs:
        subject = {"subject_id": subject_doc.id}
    
        unit_collections = db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_doc.id).collections()        
        
        units_data_list = []
        for unit_collection_ref in unit_collections:
            unit_id = unit_collection_ref.id
            meta_doc = unit_collection_ref.document('meta').get()
            size = []
            docs = db.collection("USER").document(current_user.id).collection('SUBJECTS').document(subject_doc.id).collection(unit_id).stream()
            for doc in docs:
                if doc.id.isdigit():
                    size.append(int(doc.id))

            unit_data = {'chapter_id': unit_id,
                         'size': str(max(size)) + "題" if size else "無題數資訊"}
            
            if meta_doc.exists:
                meta_data = meta_doc.to_dict()
                unit_data.update(meta_data)
            else:
                unit_data['examtype'] = 'unknown'

            units_data_list.append(unit_data)

        subject['units'] = sorted(units_data_list, key=sort_key_chapter_number) # 排序list
        subjects_data.append(subject)

            
    return render_template('sets.html', subjects=subjects_data)

# 讀取單一章節的題目，並附上目前使用者的星號與作答歷程
def load_unit(subject_id, unit_id):
    data = {'subject_id': subject_id, 'unit_id': unit_id}
    questions = []

    question_docs = db.collection('SUBJECTS').document(subject_id).collection(unit_id).get()
    if not question_docs:
        question_docs = db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).collection(unit_id).get()
        
    stars_docs = db.collection('USER').document(current_user.id).collection('STARS').document(subject_id).collection(unit_id).get()
    stars_map = {doc.id: doc.to_dict() for doc in stars_docs}
    hist_docs = db.collection('USER').document(current_user.id).collection('HIST').document(subject_id).collection(unit_id).get()
    hist_map = {doc.id: doc.to_dict() for doc in hist_docs}
    
    for doc in question_docs:
        if doc.id != 'meta':
            question_data = doc.to_dict()
            question_data['star'] = False
            question_data['question_id'] = doc.id
            question_data["hist"] = {"answer" : 0, "correct" : 0}
            
            if doc.id in stars_map:
                if stars_map[doc.id]["star"]:
                    question_data['star'] = True
            if doc.id in hist_map:
                question_data["hist"] = hist_map[doc.id]
            questions.append(question_data)
        else:
            data['meta'] = doc.to_dict()        

    data['has_data'] = bool(questions)
    data['questions'] = questions
    return data

@app.route('/get_questions', methods=['POST'])
@login_required
def get_questions():
    datas = request.get_json()
    datas = datas.get('datas') # list

    for i in range(len(datas)):
        data = datas[i]
        unit = load_unit(data.get('subject_id'), data.get('unit_id'))
        data.update(unit)
        if not unit['has_data']:
            del data['questions']
            flash(f"在科目 {unit['subject_id']} 的單元 {unit['unit_id']} 中沒有找到題目。", 'warning')

    return jsonify({'datas': datas})

@app.route('/update_star', methods=['POST'])
@login_required
def update_star():
    data = request.get_json()
    subject_id = data.get('subject_id')
    unit_id = data.get('unit_id')
    question_id = data.get('question_id')
    is_starred = data.get('is_starred') # (true/false)
    user_question_ref = db.collection('USER').document(current_user.id).collection('STARS').document(subject_id).collection(unit_id).document(question_id)
    user_question_ref.set({'star': is_starred}, merge=True)
    return jsonify({'success': True})

@app.route('/add_subject', methods=['POST'])
@login_required
def add_subject():
    data = request.get_json()
    subject_id = data.get('subject_id') # string

    for doc in db.collection('SUBJECTS').stream():
        print(doc.id)
        if doc.id == subject_id:
            return jsonify({'success': False})

    db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).set({"created_at": firestore.SERVER_TIMESTAMP})
    return jsonify({'success': True})


@app.route('/delete_subject', methods=['POST'])
@login_required
def delete_subject():
    data = request.get_json()
    subject_id = data.get('subject_id') # string

    db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).delete()
    return jsonify({'success': True})


@app.route('/add_unit', methods=['POST'])
@login_required
def add_unit():
    data = request.get_json()
    subject_id = data.get('subject_id') # string
    unit_id = data.get('unit_id') # string
    examtype = data.get('examtype') # string

    for collection in db.collection('SUBJECTS').document(subject_id).collections():
        if collection.id == unit_id:
            print("failed")
            return jsonify({'success': False})

    db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).set({"update_at" : firestore.SERVER_TIMESTAMP})
    db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).collection(unit_id).document("meta").set({"examtype" : examtype, "owner" : current_user.id})
    return jsonify({'success': True})

@app.route('/delete_unit', methods=['POST'])
@login_required
def delete_unit():
    data = request.get_json()
    subject_id = data.get('subject_id') # string
    unit_id = data.get('unit_id') # string

    collection_ref = db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).collection(unit_id).stream()
    for doc in collection_ref:
        doc.reference.delete()
    return jsonify({'success': True})

@app.route('/add_question', methods=['POST'])
@login_required
def add_question():
    data = request.get_json()
    subject_id = data.get('subject_id') # string
    unit_id = data.get('unit_id') # string
    question_id = data.get('question_id') # string 
    question_data = data.get('question_data') # dict{"Q" : "", "O1" : "", "O2" : "", "O3" : "", "O4" : "", "A" : ""}

    for collection in db.collection('SUBJECTS').document(subject_id).collections():
        if collection.id == unit_id:
            print("failed")
            return jsonify({'success': False})

    print("success")
    db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).collection(unit_id).document(question_id).set(question_data)
    return jsonify({'success': True})

@app.route('/delete_question', methods=['POST'])
@login_required
def delete_question():
    data = request.get_json()
    subject_id = data.get('subject_id') # string
    unit_id = data.get('unit_id') # string
    question_id = data.get('question_id') # string 

    db.collection('USER').document(current_user.id).collection('SUBJECTS').document(subject_id).collection(unit_id).document(question_id).delete()
    return jsonify({'success': True})

@app.route('/update_hist', methods=['POST'])
@login_required
def update_hist():
    datas = request.get_json()["datas"]
    for data in datas:

        subject_id = data.get('subject_id') # string
        unit_id = data.get('unit_id') # string
        question_id = data.get('question_id') # string 
        correct = data.get('correct') # bool true
        db.collection('USER').document(current_user.id).collection('HIST').document(subject_id).collection(unit_id).document(question_id).set({"answer" : firestore.Increment(1), "correct" : firestore.Increment(1) if correct else firestore.Increment(0)}, merge=True)
    
    return jsonify({'success': True})

@app.route('/add_test_record', methods=['POST'])
@login_required
def add_test_record():
    data = request.get_json()
    db.collection('USER').document(current_user.id).collection('TEST_RECORDS').add(data)
    
    return jsonify({'success': True})

@app.route('/get_test_record', methods=['POST'])
@login_required
def get_test_record():

    records = []
    for doc in db.collection('USER').document(current_user.id).collection('TEST_RECORDS').get():
        record = doc.to_dict()
        record["record_id"] = doc.id
        records.append(record)

    return jsonify({'datas': records})

@app.route('/get_test_record_detail', methods=['POST'])
@login_required
def get_test_record_detail():
    data = request.get_json()
    record_id = data["record_id"]
    record = db.collection('USER').document(current_user.id).collection('TEST_RECORDS').document(record_id).get().to_dict()
    result = []
    for re in record["questions"]:
        stars_docs = db.collection('USER').document(current_user.id).collection('STARS').document(re["subject_id"]).collection(re["unit_id"]).get()
        stars_map = {doc.id: doc.to_dict() for doc in stars_docs}
        hist_docs = db.collection('USER').document(current_user.id).collection('HIST').document(re["subject_id"]).collection(re["unit_id"]).get()
        hist_map = {doc.id: doc.to_dict() for doc in hist_docs}
        questions = []
        for question_id in re["questions"]:
            doc = db.collection('SUBJECTS').document(re["subject_id"]).collection(re["unit_id"]).document(str(question_id)).get()
            
            if not doc.exists:
                doc = db.collection('USER').document(current_user.id).collection('SUBJECTS').document(re["subject_id"]).collection(re["unit_id"]).document(str(question_id)).get()
            question_data = doc.to_dict()
            question_data['star'] = False
            question_data['star'] = False
            question_data['question_id'] = doc.id
            question_data["hist"] = {"answer" : 0, "correct" : 0}
            
            if doc.id in stars_map:
                if stars_map[doc.id]["star"]:
                    question_data['star'] = True
            if doc.id in hist_map:
                question_data["hist"] = hist_map[doc.id]
            questions.append(question_data)

        if len(questions) != len(re["questions"]):
            print("get_test_record_detail false") 
        else:
            re['questions'] = questions
            result.append(re)
    
    record["questions"] = result     
    return jsonify({'success': True, "datas" : record})

@app.route('/upgrade')
@login_required
def upgrade():
    return render_template('upgrade.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/practice')
@login_required
def practice():
    return render_template('practice.html') 

@app.route('/test_record')
@login_required
def test_record():
    return render_template('test_record.html')

@app.route('/get_img', methods=['POST'])
def get_img():
    data = db.collection('USER').document("IMG").get().to_dict()
    if data is None:
        return jsonify({'success': False})
    return jsonify({'success': True, "datas" : data})

@app.route('/choose_avatar', methods=['GET', 'POST'])
def choose_avatar():
    user_id = request.args.get('user_id')
    if request.method == 'POST':
        avatar = request.form.get('avatar')
        if user_id and avatar:
            db.collection("USER").document(user_id).update({"img": avatar})
            flash('註冊完成！', 'success')
            return redirect(url_for('login'))
        else:
            flash('請選擇頭像', 'danger')
    return render_template('choose_avatar.html')

@app.route('/wordle')
@login_required
def wordle():
    return render_template('wordle.html')

# 本機開發用；正式環境由 gunicorn 啟動（見 Dockerfile）
if __name__ == '__main__':
    app.run(debug=not IS_PRODUCTION, host="0.0.0.0", port=int(os.environ.get('PORT', 8787)))