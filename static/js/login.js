// // 您的 Firebase 配置對象
// // 請從您的 Firebase 專案設定中取得
// const firebaseConfig = {
//     apiKey: "YOUR_API_KEY",
//     authDomain: "YOUR_AUTH_DOMAIN",
//     projectId: "YOUR_PROJECT_ID",
//     storageBucket: "YOUR_STORAGE_BUCKET",
//     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//     appId: "YOUR_APP_ID"
// };

// // 初始化 Firebase
// firebase.initializeApp(firebaseConfig);

// // 取得 Auth 服務
// const auth = firebase.auth();

// // Google 登入按鈕點擊事件
// const googleSignInBtn = document.getElementById('googleSignInBtn');
// if (googleSignInBtn) { // 檢查按鈕是否存在，因為這個 JS 可能也會被首頁引入
//     googleSignInBtn.addEventListener('click', () => {
//         const provider = new firebase.auth.GoogleAuthProvider();
//         auth.signInWithPopup(provider) // 或 signInWithRedirect(provider)
//             .then((result) => {
//                 // 登入成功
//                 const user = result.user;
//                 console.log('Google 登入成功', user);
//                 // 在此處處理登入後的邏輯，例如導向到使用者儀表板
//                  window.location.href = "/dashboard"; // 範例：導向到儀表板頁面
//             })
//             .catch((error) => {
//                 // 登入失敗
//                 const errorCode = error.code;
//                 const errorMessage = error.message;
//                 console.error('Google 登入失敗:', errorCode, errorMessage);
//                 alert("Google 登入失敗: " + errorMessage); // 簡單的錯誤提示
//             });
//     });
// }


// // Facebook 登入按鈕點擊事件
// const facebookSignInBtn = document.getElementById('facebookSignInBtn');
// if (facebookSignInBtn) { // 檢查按鈕是否存在
//     facebookSignInBtn.addEventListener('click', () => {
//         const provider = new firebase.auth.FacebookAuthProvider();
//          auth.signInWithPopup(provider) // 或 signInWithRedirect(provider)
//             .then((result) => {
//                 // 登入成功
//                 const user = result.user;
//                 console.log('Facebook 登入成功', user);
//                  // 在此處處理登入後的邏輯
//                  window.location.href = "/dashboard"; // 範例：導向到儀表板頁面
//             })
//             .catch((error) => {
//                  // 登入失敗
//                 const errorCode = error.code;
//                 const errorMessage = error.message;
//                 console.error('Facebook 登入失敗:', errorCode, errorMessage);
//                  alert("Facebook 登入失敗: " + errorMessage); // 簡單的錯誤提示
//             });
//     });
// }


// // 電子郵件/密碼表單提交事件 (如果您也用 Firebase 處理此方式)
// // 注意：如果您後端自行處理電子郵件/密碼登入，則不需要這段 JS
// const emailLoginForm = document.getElementById('emailLoginForm');
// if (emailLoginForm) { // 檢查表單是否存在
//     emailLoginForm.addEventListener('submit', (event) => {
//         event.preventDefault(); // 阻止表單預設提交行為

//         const email = emailLoginForm.elements['email'].value;
//         const password = emailLoginForm.elements['password'].value;

//         auth.signInWithEmailAndPassword(email, password)
//             .then((userCredential) => {
//                 // 登入成功
//                 const user = userCredential.user;
//                 console.log('電子郵件/密碼登入成功', user);
//                  // 在此處處理登入後的邏輯
//                  window.location.href = "/dashboard"; // 範例：導向到儀表板頁面
//             })
//             .catch((error) => {
//                 // 登入失敗
//                 const errorCode = error.code;
//                 const errorMessage = error.message;
//                 console.error('電子郵件/密碼登入失敗:', errorCode, errorMessage);
//                 alert("登入失敗: " + errorMessage); // 顯示錯誤訊息
//             });
//     });
// }


// // 您可以監聽認證狀態變化
// // auth.onAuthStateChanged((user) => {
// //     if (user) {
// //         // 使用者已登入
// //         console.log('使用者已登入:', user);
// //         // 導向到登入後的頁面
// //         // 如果使用者在登入頁面但已經登入，可以導向到儀表板
// //         // if (window.location.pathname === '/login.html') { // 假設登入頁面是 login.html
// //         //     window.location.href = "/dashboard";
// //         // }
// //
// //     } else {
// //         // 使用者未登入
// //         console.log('使用者未登入');
// //         // 如果使用者在需要登入的頁面但未登入，可以導向到登入頁面
// //     }
// // });