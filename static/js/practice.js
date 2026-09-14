let currentQuestionIndex = 0;
let correctAnswersCount = 0;
let quizData = [];

const correctAudio = new Audio('/static/sound/correct.mp3');
const wrongAudio = new Audio('/static/sound/wrong.mp3');

// 1. 從 localStorage 取得題目資料（支援多 subject/unit）
function loadQuizData() {
    const data = JSON.parse(localStorage.getItem('practice_questions') || '{}');
    // console.log(data);
    // 假設 data.datas 是 [{subject_id, unit_id, questions: [...]}, ...]
    let allQuestions = [];
    if (data && Array.isArray(data.datas)) {
        data.datas.forEach(group => {
            if (Array.isArray(group.questions)) {
                group.questions.forEach(q => {
                    // 將 subject_id, unit_id 帶入每一題
                    allQuestions.push({
                        ...q,
                        subject_id: group.subject_id,
                        unit_id: group.unit_id
                    });
                });
            }
        });
    }
    return allQuestions;
}

// 2. 顯示當前題目
function displayQuestion() {
    if (!quizData || quizData.length === 0) {
        document.getElementById('question-text').innerText = '沒有可用的測驗題目。';
        document.getElementById('options-container').innerHTML = '';
        updateProgressBar();
        return;
    }

    if (currentQuestionIndex >= quizData.length) {
        displayCompletionMessage();
        updateProgressBar();
        return;
    }

    const question = quizData[currentQuestionIndex];
    document.getElementById('question-text').innerText =
        `問題 ${currentQuestionIndex + 1}: ${question.Q ? question.Q.replace(/\n/g, '') : '無法載入題目。'}`;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    const optionsKeys = ['O1', 'O2', 'O3', 'O4', 'O5'];
    optionsKeys.forEach(key => {
        if (question[key]) {
            const match = question[key].match(/^\(?([A-E])\)?[).．、\s]*([\s\S]*)$/);
            let optionLetter, optionText;
            if (match) {
                optionLetter = match[1];
                optionText = match[2].trim();
            } else {
                // fallback
                optionLetter = key.replace('O', '');
                optionText = question[key];
            }
            const optionCard = document.createElement('div');
            optionCard.classList.add('option-card');
            optionCard.innerHTML = `<p>(${optionLetter}) ${optionText}</p>`;
            optionCard.dataset.letter = optionLetter;
            optionCard.addEventListener('click', () => {
                selectOption(optionCard, optionLetter, question.A, question);
            });
            optionsContainer.appendChild(optionCard);
        }
    });
    updateProgressBar();
}

// 3. 選擇選項並即時更新作答紀錄
function selectOption(selectedCard, selectedLetter, correctAnswer, question) {
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.add('disabled');
        card.classList.remove('selected', 'correct', 'incorrect');
    });
    selectedCard.classList.add('selected');

    // 從正確答案抓出字母
    const correctMatch = correctAnswer.match(/^\(?([A-E])\)?[).．、\s]*([\s\S]*)$/);
    let correctLetter = correctMatch ? correctMatch[1] : correctAnswer.trim();

    const isCorrect = selectedLetter === correctLetter;
    if (isCorrect) {
        selectedCard.classList.add('correct');
        correctAnswersCount++;
        correctAudio.currentTime = 0;
        correctAudio.play();
    } else {
        selectedCard.classList.add('incorrect');
        wrongAudio.currentTime = 0;
        wrongAudio.play();
        document.querySelectorAll('.option-card').forEach(card => {
            if (card.dataset.letter === correctLetter) {
                card.classList.add('correct');
            }
        });
    }

    // 4. 呼叫 /update_hist
    fetch('/update_hist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            datas: [{
                subject_id: question.subject_id,
                unit_id: question.unit_id,
                question_id: question.question_id,
                correct: isCorrect
            }]
        })
    });

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < quizData.length) {
            displayQuestion();
        } else {
        //    console.log(currentQuestionIndex);
            displayCompletionMessage();
            updateProgressBar();
        }
    }, 1000);
}

// 5. 進度條與題數
function updateProgressBar() {
    const progressFill = document.querySelector('.progress-fill');
    const questionCountElement = document.getElementById('question-count');
    const total = quizData.length;
    if (total > 0) {
        if (progressFill) {
            const progress = (currentQuestionIndex / total) * 100;
            progressFill.style.width = `${progress}%`;
        }
        if (questionCountElement) {
            const current = currentQuestionIndex >= total ? total : currentQuestionIndex + 1;
            questionCountElement.textContent = `${current}/${total}`;
        }
    } else {
        if (progressFill) progressFill.style.width = '0%';
        if (questionCountElement) questionCountElement.textContent = '0/0 題';
    }
}

// 6. 完成訊息與答題率
function displayAccuracy() {
    const questionArea = document.getElementById('question-area');
    if (questionArea) {
        const total = quizData.length;
        let accuracy = 0;
        if (total > 0) accuracy = (correctAnswersCount / total) * 100;
        questionArea.innerHTML += `<p>您的答題率：${accuracy.toFixed(2)}%</p>`;
    }
}
function displayCompletionMessage() {
    const questionArea = document.getElementById('question-area');
    if (questionArea) {
        questionArea.innerHTML = '<h1>測驗完成！</h1>';
        displayAccuracy();
        questionArea.classList.add('quiz-completed');
    }

    // === 送出測驗紀錄 ===
    // 1. 統計資料
    const total = quizData.length;
    const accuracy = total > 0 ? ((correctAnswersCount / total) * 100).toFixed(2) + '%' : '0%';
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;

    // 2. 整理 questions 結構
    // 需 group by subject_id/unit_id
    const grouped = {};
    quizData.forEach(q => {
        const key = `${q.subject_id}|||${q.unit_id}`;
        if (!grouped[key]) {
            grouped[key] = {
                subject_id: q.subject_id,
                unit_id: q.unit_id,
                questions: []
            };
        }
        grouped[key].questions.push(q.question_id);
    });
    const questions = Object.values(grouped);

    // 3. 組成 payload
    const payload = {
        date: dateStr,
        accuracy: accuracy,
        num: total.toString(),
        questions: questions
    };

    console.log(payload);
    
    // 4. 傳送到 /add_test_record
    fetch('/add_test_record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            console.log('測驗紀錄已儲存');
        } else {
            alert('測驗紀錄儲存失敗');
        }
    })
    .catch(() => {
        alert('測驗紀錄儲存時發生錯誤');
    });
}

// 7. 初始化
document.addEventListener('DOMContentLoaded', () => {
    quizData = loadQuizData();

    if (quizData && Array.isArray(quizData) && quizData.length > 0) {
        const totalOriginalQuestions = quizData.length;
        let numberOfQuestionsToTestInput;
        let parsedInput;
        while (true) {
            numberOfQuestionsToTestInput = prompt(`共有 ${totalOriginalQuestions} 題，請輸入您想測驗的題數：`);
            if (numberOfQuestionsToTestInput === null) {
                alert(`已取消，將使用所有 ${totalOriginalQuestions} 題進行測驗。`);
                parsedInput = totalOriginalQuestions;
                break;
            }
            parsedInput = parseInt(numberOfQuestionsToTestInput);
            if (!isNaN(parsedInput) && parsedInput > 0 && parsedInput <= totalOriginalQuestions) {
                break;
            } else {
                alert(`輸入無效，請輸入一個介於 1 到 ${totalOriginalQuestions} 之間的數字。`);
            }
        }
        const numberOfQuestionsToTest = parsedInput;
        quizData = quizData.sort(() => Math.random() - 0.5).slice(0, numberOfQuestionsToTest);
        currentQuestionIndex = 0;
        displayQuestion();
        updateProgressBar();
    } else {
        document.getElementById('question-text').innerText = '無法載入測驗資料，請聯繫管理員。';
        document.getElementById('options-container').innerHTML = '';
        document.getElementById('practice-footer').style.display = 'none';
        updateProgressBar();
    }
});

// 8. 關閉按鈕
const closeButton = document.querySelector('.close-btn');
if (closeButton) {
    closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        window.history.back();
    });
}