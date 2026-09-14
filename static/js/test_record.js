document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_test_record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        renderTestRecords(data.datas || []);
    });

    function renderTestRecords(records) {
        console.log(records);

        const list = document.getElementById('test-record-list');
        if (!records.length) {
            list.innerHTML = '<p>尚無測驗紀錄。</p>';
            return;
        }
        list.innerHTML = '';
        records.forEach(record => {
            const card = document.createElement('div');
            card.className = 'test-record-card';

            card.innerHTML = `
                <div class="test-record-summary">
                    <span class="test-record-date">${record.date || ''}</span>
                    <span class="test-record-accuracy">正確率：${record.accuracy || ''}</span>
                    <span class="test-record-num">題數：${record.num || ''}</span>
                    <button class="expand-btn">展開</button>
                </div>
                <div class="test-record-detail" style="display:none;"></div>
            `;

            // 展開按鈕
            card.querySelector('.expand-btn').addEventListener('click', function() {
                const detail = card.querySelector('.test-record-detail');
                if (detail.style.display === 'none') {
                    // 載入詳細資料
                    fetch('/get_test_record_detail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ record_id: record.record_id })
                    })
                    .then(res => res.json())
                    .then(result => {
                        if (result.success) {
                            detail.innerHTML = renderDetail(result.datas.questions);
                            detail.style.display = 'block';
                            this.textContent = '收合';
                        } else {
                            detail.innerHTML = '<p>載入失敗</p>';
                        }
                    });
                } else {
                    detail.style.display = 'none';
                    this.textContent = '展開';
                }
            });

            list.appendChild(card);
        });
    }

    function renderDetail(questionsGroup) {
        if (!questionsGroup || !questionsGroup.length) return '<p>無詳細題目資料</p>';
        let html = '';
        questionsGroup.forEach(group => {
            html += `<div class="test-record-group">
                <div class="test-record-group-title">
                    <b>科目：</b>${group.subject_id}　
                    <b>單元：</b>${group.unit_id}
                </div>
                <ul class="test-record-question-list">
            `;
            group.questions.forEach(q => {
                const isCorrect = q.hist && q.hist.answer === q.hist.correct;
                const resultDot = `<span class="result-dot" style="background:${isCorrect ? '#4caf50' : '#f44336'}"></span>`;
                // 新增 correct/incorrect class 到題號
                html += `<li data-question="${encodeURIComponent(JSON.stringify(q))}">
                    ${resultDot}
                    <span class="test-record-qid ${isCorrect ? 'qid-correct' : 'qid-incorrect'}">#${q.question_id}</span>
                    <span class="test-record-qtext">${q.Q || ''}</span>
                    <span class="test-record-qstar">${q.star ? '★' : ''}</span>
                </li>`;
            });
            html += '</ul></div>';
        });
        return html;
    }

    // --- Modal 相關變數 ---
    const practiceQuestionModal = document.getElementById('practiceQuestionModal');
    const closePracticeModalBtn = document.getElementById('closePracticeModalBtn');
    const modalQuestionId = document.getElementById('modalQuestionId');
    const modalQuestionText = document.getElementById('modalQuestionText');
    const modalOptions = document.getElementById('modalOptions');
    const modalFeedback = document.getElementById('modalFeedback');
    const checkAnswerBtn = document.getElementById('checkAnswerBtn');
    const prevQuestionBtn = document.getElementById('prevQuestionBtn');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');

    let modalQuestions = [];
    let currentModalIndex = -1;

    // 顯示題目到 Modal
    function displayQuestionInModal(question, questionsArr) {
        modalQuestions = questionsArr;
        currentModalIndex = questionsArr.findIndex(q => q.question_id === question.question_id);

        modalQuestionId.textContent = `題目: ${question.question_id}`;
        modalQuestionText.innerHTML = `<p>${question.Q}</p>`;
        modalOptions.innerHTML = '';

        // 顯示選項
        const optionKeys = Object.keys(question)
            .filter(key => key.startsWith('O') && key.length > 1 && !isNaN(key.substring(1)))
            .sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)));
        optionKeys.forEach(key => {
            const optionTextFull = question[key];
            const match = optionTextFull.match(/^\(?([A-E])\)?[).．、\s]*([\s\S]*)$/);
            if (match) {
                const optionLetter = match[1];
                const optionText = match[2];
                const optionElement = document.createElement('p');
                optionElement.textContent = `(${optionLetter}) ${optionText}`;
                optionElement.classList.add('modal-option-text');
                modalOptions.appendChild(optionElement);
            }
        });

        modalFeedback.textContent = '';
        modalFeedback.style.color = '';
        checkAnswerBtn.style.display = 'block';
        checkAnswerBtn.disabled = false;
        checkAnswerBtn.textContent = '顯示答案';
        modalOptions.querySelectorAll('.modal-option-text').forEach(option => {
            option.classList.remove('correct');
        });

        checkAnswerBtn.onclick = function () {
            const correctAnswerFullText = question.A;
            // 支援 "(B) ...", "B) ...", "B. ...", "B、..." 等格式
            const correctMatch = correctAnswerFullText.match(/^\(?([A-E])\)?[).．、\s]*([\s\S]*)$/);
            if (correctMatch) {
                const correctAnswerLetter = correctMatch[1];
                modalOptions.querySelectorAll('p').forEach(option => {
                    if (option.textContent.startsWith(`(${correctAnswerLetter})`)) {
                        option.classList.add('correct');
                    }
                });
            } else {
                modalFeedback.textContent = '無法顯示正確答案。';
                modalFeedback.style.color = 'red';
            }
            checkAnswerBtn.disabled = true;
        };
    }

    // Modal 導航
    if (prevQuestionBtn) {
        prevQuestionBtn.addEventListener('click', function () {
            if (currentModalIndex > 0) {
                currentModalIndex--;
                displayQuestionInModal(modalQuestions[currentModalIndex], modalQuestions);
            }
        });
    }
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', function () {
            if (currentModalIndex < modalQuestions.length - 1) {
                currentModalIndex++;
                displayQuestionInModal(modalQuestions[currentModalIndex], modalQuestions);
            }
        });
    }
    if (closePracticeModalBtn) {
        closePracticeModalBtn.addEventListener('click', () => {
            practiceQuestionModal.close();
        });
    }
    if (practiceQuestionModal) {
        practiceQuestionModal.addEventListener('click', (event) => {
            if (event.target === practiceQuestionModal) {
                practiceQuestionModal.close();
            }
        });
    }

    // 點擊題目開啟 Modal
    document.addEventListener('click', function(e) {
        const qEl = e.target.closest('.test-record-qid, .test-record-qtext');
        if (qEl) {
            // 找到 li
            const li = qEl.closest('li');
            if (!li) return;
            // 取得完整題目物件
            const question = JSON.parse(decodeURIComponent(li.getAttribute('data-question')));
            const ul = li.closest('.test-record-question-list');
            const questionsArr = Array.from(ul.querySelectorAll('li')).map(liEl =>
                JSON.parse(decodeURIComponent(liEl.getAttribute('data-question')))
            );
            displayQuestionInModal(question, questionsArr);
            practiceQuestionModal.showModal();
        }
    });

    // --- Event Listener for Keyboard Navigation ---
    document.addEventListener('keyup', function (event) {
        if (practiceQuestionModal.open) { // 確保只有在 Modal 開啟時才觸發
            if (event.key === 'ArrowLeft') { // 按下左鍵
                if (currentModalIndex > 0) {
                    currentModalIndex--; // 移到上一題
                    displayQuestionInModal(modalQuestions[currentModalIndex], modalQuestions);
                }
            } else if (event.key === 'ArrowRight') { // 按下右鍵
                if (currentModalIndex < modalQuestions.length - 1) {
                    currentModalIndex++; // 移到下一題
                    displayQuestionInModal(modalQuestions[currentModalIndex], modalQuestions);
                }
            } else if (event.key === ' ') { // 按下空白鍵
                event.preventDefault(); // 防止頁面滾動
                if (!checkAnswerBtn.disabled) { // 如果顯示答案按鈕未禁用
                    checkAnswerBtn.click(); // 模擬按下顯示答案按鈕
                }
            }   
        }
    });

}); // end of DOMContentLoaded