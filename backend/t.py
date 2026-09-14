import firebase_admin
from firebase_admin import credentials, firestore

# 初始化 Firebase
try:
    cred = credentials.Certificate('backend/firebase_config2.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Error initializing Firebase: {e}")


# for collection in db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collections():
#     print(f"Collection ID: {collection.id}")
#     # for doc in collection.stream():
#     #     print(f"Document ID: {doc.id}")
#     #     print(f"Document Data: {doc.to_dict()}")
# print()

# if "ch8" in db.collection('SUBJECTS').document("MANAGEMENT").collections():
#     print("ch8 exists")

# db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('HIST').document("6666").collection("unit_id").document("2").set({"answer" : firestore.Increment(1), "correct" : firestore.Increment(1)})

# a = db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('HIST').stream()
# for aa in a:
#     print(aa.id)
# hist_ref = db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('HIST')
# docs = hist_ref.get()  # 使用 get() 替代 stream()，從伺服器讀取
# for doc in docs:
#     print(doc.id)

# doc_ref = db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('HIST').document("INVESMENT").collection("ch8").document("1")
# print(f"Set successful, data: {doc_ref.get().to_dict()}")
# doc_ref.set({"answer": firestore.Increment(1), "correct": firestore.Increment(1)},  merge=True)
# doc_ref = db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('HIST').document("INVESMENT").collection("ch8").document("1")
# print(f"Set successful, data: {doc_ref.get().to_dict()}")


# hist_doc_ref = db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('HIST').document("555").set({"created_at": firestore.SERVER_TIMESTAMP})
# a = db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('HIST').get()
# for aa in a:
#     print(aa.id)
    

# hist_map = [ doc.to_dict() for doc in db.collection('USER').document("zEsiRjYuQ0ibOKMmytJc").collection('TEST_RECORDS').get()]
# print(hist_map)
# # 立即讀取剛寫入的文件
# doc = doc_ref.get()
# if doc.exists:
#     print(f"Set successful, data: {doc.to_dict()}")
# else:
#     print("Set failed, document not found")


doc = db.collection('USER').document("XZhGLtnxR3LVf8wSzDeT").collection('SUBJECTS').document("INVESTMENT").collection("ch5").document(str(1)).get()
question_data = doc.to_dict()
print(question_data)