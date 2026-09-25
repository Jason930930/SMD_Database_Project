document.addEventListener('DOMContentLoaded', function() {
    // console.log(subjects);

    const filterButtons = document.querySelectorAll('.filter-button');
    const mockExamButtons = document.querySelectorAll('.mock-exam-button');

    // 選擇動態生成的單元項目
    const unitItems = document.querySelectorAll('.unit-item');
    const filterBar = document.querySelector('.filter-bar'); // 獲取 filter-bar 元素
    const filterIndicator = document.querySelector('.filter-indicator'); // 獲取指示器元素

    // 函數：更新指示器的位置和寬度
    function updateIndicator(activeButton) {
        if (!activeButton) return;

        const barRect = filterBar.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        const left = buttonRect.left - barRect.left;
        const width = buttonRect.width;

        filterIndicator.style.left = left + 'px';
        filterIndicator.style.width = width + 'px';
    }

    // 初始化指示器的位置 (頁面載入時)
    const initialActiveButton = document.querySelector('.filter-button.active');
    updateIndicator(initialActiveButton);

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');

            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            updateIndicator(this);

            // 重新選擇單元項目，因為它們是動態生成的
                const currentUnitItems = document.querySelectorAll('.unit-item');
                currentUnitItems.forEach(item => {
                const examType = item.getAttribute('data-exam');

                if (filter === 'all') { //所有科目
                    item.style.display = 'flex';
                } else {
                        // 這裡的過濾邏輯依賴於 data-exam 屬性，如果你的數據沒有，需要修改
                    if (examType === filter) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                    if(examType === 'midterm' && (filter === 'midterm1' || filter === 'midterm2')) {
                        item.style.display = 'flex';
                    }
                }
            });
        });
    });

    // 根據 data-progress 屬性設定水位高度 (保持不變)
    const unitItemsWithProgress = document.querySelectorAll('.unit-item.unit-block[data-progress]');
    unitItemsWithProgress.forEach(item => {
        const progress = item.getAttribute('data-progress');
        if (progress !== null && !isNaN(progress)) {
            item.style.setProperty('--water-level-height', progress + '%');
        }
    });

    mockExamButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const subjectSection = this.closest('.subject-section');
            const subjectId = this.getAttribute('data-subject-id');
            // 找到這個科目下所有被選取的單元
            const selectedUnits = Array.from(subjectSection.querySelectorAll('.unit-item.selected'))
                .map(unit => unit.querySelector('.unit-title').textContent.trim());

            if (selectedUnits.length === 0) {
                alert('請先選取至少一個單元');
                return;
            }

            const datas = selectedUnits.map(unitId => ({
                subject_id: subjectId,
                unit_id: unitId
            }));

            fetch('/get_questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datas })
            })
            .then(res => res.json())
            .then(result => {
                localStorage.setItem('practice_questions', JSON.stringify(result));
                console.log(result);
                window.location.href = '/practice';
            })
            .catch(() => {
                alert('取得題目失敗');
            });
        

            // 送出到 /practice
            // const params = new URLSearchParams();
            // params.append('subject_id', subjectId);
            // selectedUnits.forEach(unitId => params.append('unit_ids', unitId));

            // window.location.href = `/practice?${params.toString()}`;
        });
    });

    // 單元選取與雙擊觸發
    let lastClickTime = 0;
    let lastClickedUnit = null;

    document.querySelectorAll('.unit-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // 多選：toggle 選取狀態
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
            } else {
                this.classList.add('selected');
            }

            // 雙擊判斷
            const now = Date.now();
            if (lastClickedUnit === this && now - lastClickTime < 400) {
                const subjectSection = this.closest('.subject-section');
                const subjectId = subjectSection.querySelector('.mock-exam-button').getAttribute('data-subject-id');
                const unitId = this.querySelector('.unit-title').textContent.trim();
                
                // 章節頁會依網址參數自行向伺服器讀取題目
                const params = new URLSearchParams({ subject_id: subjectId, unit_id: unitId });
                window.location.href = '/chapter?' + params.toString();
            }

            lastClickTime = now;
            lastClickedUnit = this;
        });
    });


    // --- 新增科目卡片互動 ---
    const addCard = document.getElementById('add-subject-card');
    const placeholder = document.getElementById('add-subject-placeholder');
    const form = document.getElementById('add-subject-form');
    const input = document.getElementById('add-subject-input');
    const cancel = document.getElementById('add-subject-cancel');
    const submit = document.getElementById('add-subject-submit');
    const msg = document.getElementById('add-subject-msg');
    const subjectList = document.querySelector('.subject-category-list');

    // 點擊整個卡片或 placeholder 顯示輸入表單
    addCard.addEventListener('click', function(e) {
        if (e.target === addCard || e.target === placeholder) {
            placeholder.style.display = 'none';
            form.style.display = 'flex';
            input.focus();
        }
    });

    // 取消
    cancel.addEventListener('click', function(e) {
        e.stopPropagation();
        form.style.display = 'none';
        placeholder.style.display = 'flex';
        input.value = '';
        msg.textContent = '';
    });

    // 確定送出
    submit.addEventListener('click', function(e) {
        e.stopPropagation();
        const subjectName = input.value.trim().toUpperCase();
        if (!subjectName) {
            msg.textContent = '請輸入科目名稱';
            msg.style.color = '#ff7675';
            return;
        }
        fetch('/add_subject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id: subjectName })
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                msg.style.color = '#1db954';
                msg.textContent = '新增成功！';
                // setTimeout(() => {
                    location.reload(); // 新增成功後重新整理頁面
                // }, 600);

                // 2. 關閉表單，重設
                setTimeout(() => {
                    form.style.display = 'none';
                    placeholder.style.display = 'flex';
                    input.value = '';
                    msg.textContent = '';
                }, 800);
            } else {
                msg.style.color = '#ff7675';
                msg.textContent = '新增失敗，科目可能已存在';
            }
        })
        .catch(() => {
            msg.style.color = '#ff7675';
            msg.textContent = '伺服器錯誤，請稍後再試';
        });
    });

    //--- 新增單元卡片互動 ---
    document.querySelectorAll('.add-unit-block').forEach(function(card) {
        const placeholder = card.querySelector('.add-unit-placeholder');
        const form = card.querySelector('.add-unit-form');
        const input = card.querySelector('.add-unit-input');
        const examtype = card.querySelector('.add-unit-examtype');
        const cancel = card.querySelector('.add-unit-cancel');
        const submit = card.querySelector('.add-unit-submit');
        const msg = card.querySelector('.add-unit-msg');

        // 只在 placeholder 上加事件
        if (placeholder) {
            placeholder.addEventListener('click', function(e) {
                e.stopPropagation();
                placeholder.style.display = 'none';
                form.style.display = 'flex';
                input.focus();
            });
        }

        // 取消
        if (cancel) {
            cancel.addEventListener('click', function(e) {
                e.stopPropagation();
                form.style.display = 'none';
                placeholder.style.display = 'flex';
                input.value = '';
                examtype.value = '';
                msg.textContent = '';
            });
        }

        // 確定送出
        if (submit) {
            submit.addEventListener('click', function(e) {
                e.stopPropagation();
                const subjectSection = card.closest('.subject-section');
                const subjectTitleElem = subjectSection ? subjectSection.querySelector('.subject-title') : null;
                if (!subjectTitleElem) {
                    msg.textContent = '找不到科目，請重新整理頁面';
                    msg.style.color = '#ff7675';
                    return;
                }
                const subjectId = subjectTitleElem.textContent.replace('科目：', '').trim();

                const unitName = input.value.trim();
                const examTypeVal = examtype.value.trim();
                if (!unitName || !examTypeVal) {
                    msg.textContent = '請輸入單元名稱與類型';
                    msg.style.color = '#ff7675';
                    return;
                }
                fetch('/add_unit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject_id: subjectId, unit_id: unitName, examtype: examTypeVal })
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        msg.style.color = '#1db954';
                        msg.textContent = '新增成功！';
                        // setTimeout(() => {
                            location.reload(); // 新增單元成功後重新整理頁面
                        // }, 600);
                        
                        // 關閉表單
                        setTimeout(() => {
                            form.style.display = 'none';
                            placeholder.style.display = 'flex';
                            input.value = '';
                            examtype.value = '';
                            // msg.textContent = '';
                        }, 800);
                    } else {
                        msg.style.color = '#ff7675';
                        msg.textContent = '新增失敗！';
                    }
                })
                .catch(() => {
                    alert('伺服器錯誤，請稍後再試');
                });
            });
        }
    });

    //------------------------------------------------------------------------
    // --- subject 更多選單與刪除 ---
    // 根據權限動態顯示/隱藏刪除科目按鈕
    document.querySelectorAll('.subject-section').forEach(section => {
        // 取得科目名稱
        const subjectIdElem = section.querySelector('.subject-title');
        if (!subjectIdElem) return;
        const subjectId = subjectIdElem.textContent.replace('科目：', '').trim();

        // 從全域 subjects 陣列找出對應 subject
        const subject = subjects.find(s => s.subject_id === subjectId);
        console.log(subjects);
        if (!subject) return;

        // 判斷這個科目下的所有單元是否都是自己建立的（或沒有單元）
        const allPrivate = subject.units.length === 0 ||
            subject.units.every(unit => unit.owner === currentUserId);

        // 只有全部單元都是自己建立時，才顯示「更多」選單（如刪除按鈕）
        const moreMenuContainer = section.querySelector('.subject-more-menu-container');
        if (moreMenuContainer) {
            moreMenuContainer.style.display = allPrivate ? '' : 'none';
        }
    });

    document.querySelectorAll('.subject-more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            // 關閉其他已開啟的選單
            document.querySelectorAll('.subject-more-menu').forEach(menu => {
                if (menu !== this.nextElementSibling) menu.style.display = 'none';
            });
            // 切換本選單
            const menu = this.nextElementSibling;
            if (menu) {
                menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
            }
        });
    });

    // 點擊空白處關閉選單
    document.addEventListener('click', function() {
        document.querySelectorAll('.subject-more-menu').forEach(menu => menu.style.display = 'none');
    });

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('subject-delete-btn')) {
            e.stopPropagation();
            const subjectId = e.target.getAttribute('data-subject-id');
            // 從全域 subjects 陣列找出對應 subject
            const subject = subjects.find(s => s.subject_id === subjectId);
            if (!subject) {
                alert('找不到科目資料，請重新整理頁面');
                return;
            }
            // 單元數為 0 也允許刪除
            const allPrivate = subject.units.length === 0 ||
                subject.units.every(unit => unit.owner === currentUserId);
            
            if (!allPrivate) {
                alert('只有所有單元都是私人（自己建立）時才能刪除此科目！');
                return;
            }

            if (confirm(`確定要刪除科目「${subjectId}」嗎？此操作無法復原。`)) {
                fetch('/delete_subject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject_id: subjectId })
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        location.reload();
                    } else {
                        alert(result.msg || '刪除失敗，請稍後再試');
                    }
                });
            }
        }
    });

}); // End of DOMContentLoaded