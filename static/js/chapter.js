document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element References ---
    // Get references to key DOM elements used throughout the script.
    const sortBySelect = document.getElementById('sort-by'); // Select element for sorting by answer rate
    const topicTableBody = document.getElementById('topic-table-body'); // Table body where topic rows are displayed
    const sortByStarHeader = document.getElementById('sort-by-star-header'); // Table header for sorting by star status
    const starIcons = document.querySelectorAll('.star-icon'); // All individual star icons in the table
    
    // Assume these modal-related elements exist in your HTML (as they are used but not declared in the snippet)
    const practiceQuestionModal = document.getElementById('practiceQuestionModal'); // The practice modal dialog
    const closePracticeModalBtn = document.getElementById('closePracticeModalBtn'); // Button to close the practice modal
    const modalQuestionId = document.getElementById('modalQuestionId'); // Element to display question ID in modal
    const modalQuestionText = document.getElementById('modalQuestionText'); // Element to display question text in modal
    const modalOptions = document.getElementById('modalOptions'); // Container for displaying options in modal
    const modalFeedback = document.getElementById('modalFeedback'); // Element to display feedback (like correct answer)
    const checkAnswerBtn = document.getElementById('checkAnswerBtn'); // Button to reveal the answer
    const prevQuestionBtn = document.getElementById('prevQuestionBtn'); // Button to go to the previous question
    const nextQuestionBtn = document.getElementById('nextQuestionBtn'); // Button to go to the next question


    // --- State Variables ---
    let isStarSortActive = false; // Flag to track if sorting by star is currently active
    let currentQuestionIndex = -1; // Track the index of the question currently displayed in the modal within the sorted list
    let sortedQuestions = []; // Store the currently sorted list of question data objects (derived from table rows)
    // Assume 'allQuestions' is a global variable or available in the scope, containing all original question data
    // Example structure assumed for allQuestions: [{ id: 'Q1', Q: 'Question text', O1: 'A) Opt A', O2: 'B) Opt B', A: 'A) Opt A' }, ...]

    // --- Helper Functions ---

    /**
     * Displays a list of table rows in the table body with a staggered fade-in animation.
     * @param {HTMLElement[]} rows - An array of table row elements (<tr>) to display.
     */
    function displayRowsWithAnimation(rows) {
        // Clear the current table body content
        topicTableBody.innerHTML = ''; 
        
        // Iterate over the rows and add them with animation
        rows.forEach((row, index) => {
            // Initial styles for animation start
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';

            // Define the transition property
            row.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

            // Append the row to the table body
            topicTableBody.appendChild(row);

            // Use a timeout to stagger the animation effect for each row
            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50); // 50ms delay between each row's animation start
        });
    }

    /**
     * Sorts the table rows based on the current sorting criteria (answer rate, star status).
     * Then updates the display using the animation function and updates the sortedQuestions array.
     */
    function sortTable() {
        const selectedSort = sortBySelect.value; // Get the selected answer rate sort value
        // Get all data rows (<tr> with data-question-id) as an array
        const dataRows = Array.from(topicTableBody.querySelectorAll('tr[data-question-id]'));
        
        // If no rows are found, exit the function
        if (dataRows.length === 0) {
            updateSortedQuestions(); // Still update sortedQuestions even if empty
            return;
        }

        // Sort the data rows
        dataRows.sort((rowA, rowB) => {
            console.log('Sorting rows:', rowA.dataset.answerRate, rowB.dataset.answerRate); // Debugging log to see which rows are being compared
            // Check star status for both rows
            const isStarredA = rowA.querySelector('.star-icon').classList.contains('active');
            const isStarredB = rowB.querySelector('.star-icon').classList.contains('active');

            // Primary sort criterion: Starred items come first if star sort is active
            if (isStarSortActive) {
                if (isStarredA && !isStarredB) return -1; // A is starred, B is not -> A comes first
                if (!isStarredA && isStarredB) return 1; // A is not starred, B is -> B comes first
            }

            // Secondary sort criterion (or primary if star sort is not active): Based on the select value
            if (selectedSort === 'default') {
                // Sort by question ID (assuming it's numeric or can be compared as strings)
                const idA = parseInt(rowA.dataset.questionId || '0', 10);
                const idB = parseInt(rowB.dataset.questionId || '0', 10);
                 
                // Handle cases where data-question-id might not be purely numeric
                if (isNaN(idA) && isNaN(idB)) return (rowA.dataset.questionId || '').localeCompare(rowB.dataset.questionId || '');
                 if (isNaN(idA)) return 1; // Non-numeric ID goes after numeric
                 if (isNaN(idB)) return -1; // Numeric ID comes before non-numeric
                 
                return idA - idB; // Numeric comparison
                 
            } else if (selectedSort === 'answer-rate-asc') {
                // Sort by answer rate ascending
                const rateA = parseFloat(rowA.dataset.answerRate || '0'); 
                const rateB = parseFloat(rowB.dataset.answerRate || '0'); 
                return rateA - rateB;
                 
            } else if (selectedSort === 'answer-rate-desc') {
                // Sort by answer rate descending
                const rateA = parseFloat(rowA.dataset.answerRate || '0'); 
                const rateB = parseFloat(rowB.dataset.answerRate || '0'); 
                return rateB - rateA;
            }

            return 0; // If no specific sort is selected or star status is the same
        });
        
        // Display the sorted rows with animation
        displayRowsWithAnimation(dataRows);
        // Update the sortedQuestions array to match the new table order
        updateSortedQuestions();
    }
    
    /**
     * Updates the `sortedQuestions` array based on the current order of rows in the table body.
     * This is necessary for the previous/next question navigation in the modal.
     */
    function updateSortedQuestions() {
        const dataRows = Array.from(topicTableBody.querySelectorAll('tr[data-question-id]'));
        sortedQuestions = dataRows
            .map(row => {
                const questionId = row.dataset.questionId;
                return allQuestions['questions'].find(q => q.question_id === questionId); // 找到對應的題目數據
            })
            .filter(question => question != null);  // 過濾掉無效的數據
        
    }

    /**
     * Populates the practice question modal with data from a given question object.
     * Also sets up the state for showing/hiding navigation buttons.
     * @param {object} question - The question data object to display. Assumes structure { id: 'Q#', Q: 'text', O1: 'A) text', ..., A: 'A) text' }
     */
    function displayQuestionInModal(question) {
        const row = document.querySelector(`tr[data-question-id="${question.question_id}"]`);
        if (row) {
            question.subject_id = row.dataset.subjectId || question.subject_id;
            question.unit_id = row.dataset.unitId || question.unit_id;
            question.star = row.dataset.star === 'true' || question.star; // 確保 star 是布林值
        }

        // console.log('顯示的題目:', question);

        // Find the index of the current question in the sorted list
        currentQuestionIndex = sortedQuestions.findIndex(q => q.question_id === question.question_id); 

        // Update modal content
        modalQuestionId.textContent = `題目: ${question.question_id}`;
        modalQuestionText.innerHTML = `<p>${question.Q}</p>`; // Display question text

        modalOptions.innerHTML = ''; // Clear previous options

        // Extract, sort, and display options dynamically
        const optionKeys = Object.keys(question)
            .filter(key => key.startsWith('O') && key.length > 1 && !isNaN(key.substring(1))) // Find keys like O1, O2, etc.
            .sort((a, b) => { // Sort keys numerically (O1 before O10)
                const numA = parseInt(a.substring(1));
                const numB = parseInt(b.substring(1));
                return numA - numB;
            });

        optionKeys.forEach(key => {
            const optionTextFull = question[key]; // e.g., "A) Option text" 或 "(A) Option text"
            const match = optionTextFull.match(/^\(?([A-E])\)?\)?\s*(.*)$/);
            if (match) {
                const optionLetter = match[1]; // A, B, C, ...
                const optionText = match[2]; // Option text content

                const optionElement = document.createElement('p');
                optionElement.textContent = `(${optionLetter}) ${optionText}`;
                optionElement.classList.add('modal-option-text'); // Add class for styling
                modalOptions.appendChild(optionElement);
            } else {
                console.warn(`無法解析選項格式: ${optionTextFull}`); // Log a warning if format is unexpected
            }
        });

        // Reset feedback area
        modalFeedback.textContent = '';
        modalFeedback.style.color = '';

        // Reset and show the "Show Answer" button
        checkAnswerBtn.style.display = 'block';
        checkAnswerBtn.disabled = false;
        checkAnswerBtn.textContent = '顯示答案';

        // Remove any previous highlighting from options
        modalOptions.querySelectorAll('.modal-option-text').forEach(option => {
            option.classList.remove('correct');
        });

        // --- Event Listener for "Show Answer" button ---
        // (Moved inside displayQuestionInModal so it applies to the current question)
        checkAnswerBtn.onclick = function () {
            // Extract the correct answer letter (支援 "A) ..." 或 "(A) ...")
            const correctAnswerFullText = question.A; 
            const correctMatch = correctAnswerFullText.match(/^\(?([A-E])\)?[).．、\s]*([\s\S]*)$/);

            if (correctMatch) {
                const correctAnswerLetter = correctMatch[1];

                // Highlight the correct option text
                modalOptions.querySelectorAll('p').forEach(option => {
                    if (option.textContent.startsWith(`(${correctAnswerLetter})`)) {
                        option.classList.add('correct'); // Add correct answer styling
                    }
                });
            } else {
                modalFeedback.textContent = '無法顯示正確答案。';
                modalFeedback.style.color = 'red';
                console.error(`正確答案格式錯誤: ${correctAnswerFullText}`);
            }

            // Disable the "Show Answer" button after clicking
            checkAnswerBtn.disabled = true;
        };

        // 更新星號狀態
        const modalStar = document.getElementById('modalStar');
        const starIcon = modalStar.querySelector('i');
        if (question.star) {
            starIcon.classList.remove('far');
            starIcon.classList.add('fas'); // 實心星號
        } else {
            starIcon.classList.remove('fas');
            starIcon.classList.add('far'); // 空心星號
        }

        // 添加星號點擊事件
        modalStar.onclick = function () {
            const isStarred = starIcon.classList.contains('fas');
            const newStarredStatus = !isStarred;

            // 更新星號圖標
            if (newStarredStatus) {
                starIcon.classList.remove('far');
                starIcon.classList.add('fas'); // 亮起
            } else {
                starIcon.classList.remove('fas');
                starIcon.classList.add('far'); // 不亮
            }

            // 發送更新請求到後端
            fetch('/update_star', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject_id: question.subject_id,
                    unit_id: question.unit_id,
                    question_id: question.id,
                    is_starred: newStarredStatus,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    console.log('Star status updated successfully');
                    question.star = newStarredStatus; // 更新本地數據

                    // 更新表格中的星號狀態
                    const row = document.querySelector(`tr[data-question-id="${question.id}"]`);
                    if (row) {
                        const rowStarIcon = row.querySelector('.star-icon i');
                        if (newStarredStatus) {
                            rowStarIcon.classList.remove('far');
                            rowStarIcon.classList.add('fas'); // 亮起
                        } else {
                            rowStarIcon.classList.remove('fas');
                            rowStarIcon.classList.add('far'); // 不亮
                        }
                    }
                } else {
                    console.error('Failed to update star status:', data.message);
                    alert('更新星號狀態失敗');
                }
            })
            .catch(error => {
                console.error('Error updating star status:', error);
                alert('與伺服器通訊時發生錯誤');

                // 恢復星號圖標的狀態
                if (newStarredStatus) {
                    starIcon.classList.remove('fas');
                    starIcon.classList.add('far');
                } else {
                    starIcon.classList.remove('far');
                    starIcon.classList.add('fas');
                }
            });
        };
    }


    // --- Event Listeners for (排序方式)Sorting ---

    // Listener for changes in the answer rate sort select dropdown
    sortBySelect.addEventListener('change', function() {
        // Deactivate star sorting when a different sort option is selected
        isStarSortActive = false;
        // Remove visual indicator from the star header
        sortByStarHeader.classList.remove('active-sort-header'); 
        // Perform the sort based on the new selection
        sortTable();
    });

    // Listener for clicks on the star sort header icon
    sortByStarHeader.addEventListener('click', function() {
        // Toggle the star sort active state
        isStarSortActive = !isStarSortActive;

        // Add or remove a class to the header for visual indication of active state
        if (isStarSortActive) {
            sortByStarHeader.classList.add('active-sort-header');
        } else {
            sortByStarHeader.classList.remove('active-sort-header');
        }

        // Perform the sort with the updated star sort state
        sortTable();
    });


    // --- Event Listener for 各個題目的星星 ---
    // Attach listeners to each star icon to toggle its state and update the backend
    // starIcons.forEach(starIcon => {
    //     starIcon.addEventListener('click', function(event) {
    //         // Stop the click event from bubbling up to the table row (if there's a row click handler)
    //         event.stopPropagation(); 
            
    //         // Get the closest table row ancestor to access data attributes
    //         const row = this.closest('tr'); 
    //         const questionId = row.dataset.questionId;
    //         const subjectId = row.dataset.subjectId; 
    //         const unitId = row.dataset.unitId;     

    //         // Determine the current state and the intended new state
    //         const isStarred = this.classList.contains('active');
    //         const newStarredStatus = !isStarred; // Toggle the status

    //         // --- Optimistic UI Update ---
    //         // Toggle the visual appearance immediately before the backend call
    //         this.classList.toggle('active', newStarredStatus);
    //         const icon = this.querySelector('i'); // Assuming Font Awesome icons (.far for outline, .fas for solid)
    //         if (newStarredStatus) {
    //             icon.classList.remove('far');
    //             icon.classList.add('fas');
    //         } else {
    //             icon.classList.remove('fas');
    //             icon.classList.add('far');
    //         }

    //         // Update the data-star attribute
    //         row.dataset.star = newStarredStatus;
            
    //         // --- Send Update to Backend ---
    //         fetch('/update_star', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 // Consider adding a CSRF token here if you are using them for security
    //             },
    //             body: JSON.stringify({
    //                 subject_id: subjectId,
    //                 unit_id: unitId,
    //                 question_id: questionId,
    //                 is_starred: newStarredStatus // Send the intended new status
    //             }),
    //         })
    //         .then(response => {
    //             // Check if the response indicates success (e.g., status code 2xx)
    //             if (!response.ok) {
    //                 throw new Error(`HTTP error! status: ${response.status}`);
    //             }
    //             return response.json(); // Parse the JSON response
    //         })
    //         .then(data => {
    //             if (data.success) {
    //                 console.log('Star status updated successfully.');
    //                 // If star sort is active, re-sort the table after successful update
    //                 if (isStarSortActive) {
    //                    sortTable();
    //                 } else {
    //                    // If star sort isn't active, just ensure the sortedQuestions array is updated
    //                    // in case this starred status affects future sorting or navigation
    //                    updateSortedQuestions(); 
    //                 }
    //             } else {
    //                 console.error('Failed to update star status:', data.message);
    //                 // Revert the visual change if the backend reported failure
    //                 revertStarUI(this, isStarred);
    //                 alert('更新星號狀態失敗。'); // Inform the user
    //             }
    //         })
    //         .catch(error => {
    //             console.error('Error sending update request:', error);
    //             // Revert the visual change if the request itself failed
    //             revertStarUI(this, isStarred);
    //             alert('與伺服器通訊時發生錯誤。'); // Inform the user
    //         });
    //     });
    // });
    
    /**
     * Helper function to revert the star icon's visual state.
     * @param {HTMLElement} starIconElement - The star icon element clicked.
     * @param {boolean} originalStarredStatus - The original starred status before the click.
     */
    function revertStarUI(starIconElement, originalStarredStatus) {
        starIconElement.classList.toggle('active', originalStarredStatus); // Revert class
        const icon = starIconElement.querySelector('i');
        if (originalStarredStatus) { // Revert icon
            icon.classList.remove('far');
            icon.classList.add('fas');
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
        }
    }


    // --- 開始練習按鈕 ---
    document.querySelector('.practice-unit-btn').addEventListener('click', function(e) {
        // 包裝成 practice.js 預期格式
        const practiceData = {
            datas: [
                {
                    subject_id: allQuestions.subject_id,
                    unit_id: allQuestions.unit_id,
                    questions: allQuestions.questions
                }
            ]
        };
        localStorage.setItem('practice_questions', JSON.stringify(practiceData));
        window.location.href = '/practice';
        e.preventDefault();
    });

    // --- Practice Question Modal Logic ---

    // Function to show the modal with animation
    function showPracticeModal() {
        practiceQuestionModal.classList.add('show'); // Add the 'show' class for animation
        practiceQuestionModal.classList.remove('hide'); // Ensure 'hide' class is removed
    }

    // Function to hide the modal with animation
    function hidePracticeModal() {
        practiceQuestionModal.classList.add('hide'); // Add the 'hide' class for animation
        practiceQuestionModal.classList.remove('show'); // Ensure 'show' class is removed

        // Wait for the animation to complete before fully closing the modal
        setTimeout(() => {
            practiceQuestionModal.close(); // Close the modal
        }, 300); // Match the duration of the CSS transition
    }

    // Listener for the modal's close button
    if (closePracticeModalBtn) {
        closePracticeModalBtn.addEventListener('click', () => {
            hidePracticeModal(); // Use the hide function
        });
    }

    // Listener to close the modal if clicking outside of its content
    if (practiceQuestionModal) {
        practiceQuestionModal.addEventListener('click', (event) => {
            if (event.target === practiceQuestionModal) {
                hidePracticeModal(); // Use the hide function
            }
        });
    }

    // Clicks on any 題目列表 that represents a question
    topicTableBody.addEventListener('click', function(event) {
        const starIcon = event.target.closest('.star-icon');
        if (starIcon) {
            event.stopPropagation();
            const row = starIcon.closest('tr');
            const questionId = row.dataset.questionId;
            const subjectId = row.dataset.subjectId;
            const unitId = row.dataset.unitId;

            const isStarred = starIcon.classList.contains('active');
            const newStarredStatus = !isStarred;
            starIcon.classList.toggle('active', newStarredStatus);
            const icon = starIcon.querySelector('i');
            if (newStarredStatus) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
            row.dataset.star = newStarredStatus;

            fetch('/update_star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_id: subjectId,
                    unit_id: unitId,
                    question_id: questionId,
                    is_starred: newStarredStatus
                }),
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    revertStarUI(starIcon, isStarred);
                    alert('更新星號狀態失敗。');
                } else {
                    if (isStarSortActive) sortTable();
                    else updateSortedQuestions();
                }
            })
            .catch(() => {
                revertStarUI(starIcon, isStarred);
                alert('與伺服器通訊時發生錯誤。');
            });
            return; // ⭐️ 點星號後直接 return，不再往下執行
        }

        const target = event.target;

        // Find the closest table row (<tr>) element that has a data-question-id attribute
        const row = target.closest('tr[data-question-id]');
        
        // If a data row was clicked (and not something else in the table body)
        if (row) {
            const questionId = row.dataset.questionId;

            // Find the full question data from the 'allQuestions' array using the ID
            const questionData = allQuestions['questions'].find(q => q.question_id === questionId);

            // If the question data is found
            if (questionData) {
                // currentQuestion = questionData; // You might not need this global variable if displayQuestionInModal is called directly
                displayQuestionInModal(questionData); // Display the question in the modal
                practiceQuestionModal.showModal(); // Show the modal
                showPracticeModal(); // Add animation
            } else {
                console.error("Question data not found for ID:", questionId);
                alert('無法載入題目進行練習。找不到該題目資料。');
            }
        }
    });


    // --- Event Listeners for Practice Modal Navigation ---

    // Listener for the "Previous Question" button
    if (prevQuestionBtn) { // Check if the button exists
        prevQuestionBtn.addEventListener('click', function () {
            // Ensure the index is valid and not the first question
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--; // Decrement index
                // Display the question at the new index
                displayQuestionInModal(sortedQuestions[currentQuestionIndex]);
            }
        });
    }

    // Listener for the "Next Question" button
    if (nextQuestionBtn) { // Check if the button exists
        nextQuestionBtn.addEventListener('click', function () {
            // Ensure the index is valid and not the last question
            if (currentQuestionIndex < sortedQuestions.length - 1) {
                currentQuestionIndex++; // Increment index
                displayQuestionInModal(sortedQuestions[currentQuestionIndex]);
            }
        });
    }

    // --- Event Listener for Keyboard Navigation ---
    document.addEventListener('keyup', function (event) {
        if (practiceQuestionModal.open) { // 確保只有在 Modal 開啟時才觸發
            if (event.key === 'ArrowLeft') { // 按下左鍵
                if (currentQuestionIndex > 0) {
                    currentQuestionIndex--; // 移到上一題
                    displayQuestionInModal(sortedQuestions[currentQuestionIndex]);
                }
            } else if (event.key === 'ArrowRight') { // 按下右鍵
                if (currentQuestionIndex < sortedQuestions.length - 1) {
                    currentQuestionIndex++; // 移到下一題
                    displayQuestionInModal(sortedQuestions[currentQuestionIndex]);
                }
            } else if (event.key === ' ') { // 按下空白鍵
                event.preventDefault(); // 防止頁面滾動
                if (!checkAnswerBtn.disabled) { // 如果顯示答案按鈕未禁用
                    checkAnswerBtn.click(); // 模擬按下顯示答案按鈕
                }
            }   
        }
    });

    // --- Modal Close Listeners ---
    // Listener for the modal's close button
    if (closePracticeModalBtn) { // Check if the button exists
        closePracticeModalBtn.addEventListener('click', () => {
            practiceQuestionModal.close(); // Close the modal
            // Clean up: Remove event listeners from option buttons if they were added dynamically (not in this version, but good practice)
            // modalOptions.querySelectorAll('.modal-option').forEach(btn => {
            //     btn.removeEventListener('click', handleOptionClick); // Example cleanup
            // });
            // currentQuestion = null; // Clear the stored question data if used
        });
    }

    // Listener to close the dialog if clicking outside of its content
    if (practiceQuestionModal) { // Check if the modal exists
        practiceQuestionModal.addEventListener('click', (event) => {
            // If the click target is the dialog itself (meaning clicked outside the content)
            if (event.target === practiceQuestionModal) {

                practiceQuestionModal.close(); // Close the modal
                // Clean up event listeners/data as done for the close button
                 // modalOptions.querySelectorAll('.modal-option').forEach(btn => {
                 //     btn.removeEventListener('click', handleOptionClick); 
                 // });
                 // currentQuestion = null; 
            }
        });
    }

    // --- End of Practice Question Modal Logic ---


    // ---Start of Add Topic Dialog Logic ---
    const addTopicDialog = document.getElementById('addTopicDialog'); // The dialog element
    const showAddTopicDialogBtn = document.getElementById('showAddTopicDialogBtn'); // Button to open the dialog
    const closeAddTopicDialogBtn = document.getElementById('closeAddTopicDialogBtn'); // Button to close the dialog
    const addTopicForm = document.getElementById('addTopicForm'); // The form inside the dialog

    // Open the dialog when the button is clicked
    if (showAddTopicDialogBtn && addTopicDialog) {
        showAddTopicDialogBtn.addEventListener('click', () => {
            addTopicDialog.showModal(); // Use showModal() for proper dialog behavior
        });
    }

    // Close the dialog and reset the form when the close button is clicked
    if (closeAddTopicDialogBtn && addTopicDialog && addTopicForm) {
        closeAddTopicDialogBtn.addEventListener('click', () => {
            addTopicDialog.close();
            addTopicForm.reset(); // Clear form inputs
        });
    }

    // Handle the form submission for adding a new topic
    if (addTopicForm && addTopicDialog) {
        addTopicForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission

            // Get values from the form inputs
            const topicText = document.getElementById('newTopicText').value;
            const optionA = document.getElementById('newTopicOptionA').value;
            const optionB = document.getElementById('newTopicOptionB').value;
            const optionC = document.getElementById('newTopicOptionC').value;
            const optionD = document.getElementById('newTopicOptionD').value;
            const optionE = document.getElementById('newTopicOptionE').value; // Option E is optional
            const correctAnswer = document.getElementById('newTopicCorrectAnswer').value; // The selected correct answer letter

            // --- Form Validation ---
            // Check if required fields (question text, options A-D, correct answer) are filled
            if (!topicText || !optionA || !optionB || !optionC || !optionD) {
                alert("請填寫題目內容及選項 A、B、C、D！");
                return; // Stop submission if validation fails
            }
            
            // 組成 question_data
            const question_data = {
                Q: topicText,
                O1: "A) " + optionA,
                O2: "B) " + optionB,
                O3: "C) " + optionC,
                O4: "D) " + optionD,
                A: correctAnswer + ") " + eval("option" + correctAnswer) // 例如 "A) 6"
            };
            if (optionE.trim() !== "") {
                question_data.O5 = "E) " + optionE;
            }

            // 取得 subject_id, unit_id
            const subject_id = allQuestions.subject_id;
            const unit_id = allQuestions.unit_id;

            // console.log(allQuestions);

            let question_id = "";
            if (allQuestions && Array.isArray(allQuestions.questions)) {
                question_id = (allQuestions.questions.length + 1).toString();
            } else {
                question_id = "1";
                allQuestions.questions = []; // 初始化為空陣列
            }

            // 組成送出資料
            const data = {
                subject_id: subject_id,
                unit_id: unit_id,
                question_id: question_id,
                question_data: question_data
            };
            console.log(data);
            fetch('/add_question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    alert('題目新增成功！');

                    // 動態新增題目到表格
                    const newRow = document.createElement('tr');
                    newRow.setAttribute('data-answer-rate', "0");
                    newRow.setAttribute('data-question-id', question_id);
                    newRow.setAttribute('data-subject-id', subject_id);
                    newRow.setAttribute('data-unit-id', unit_id);
                    newRow.setAttribute('data-star', "0");

                    newRow.innerHTML = `
                        <td>
                            <a href="#" class="practice-question-link" data-question-id="${question_id}">
                                ${question_id}
                            </a>
                        </td>
                        <td>
                            <div class="answer-rate-info">
                                <div class="answer-rate-bar"> 
                                    <div class="answer-rate-fill" style="width: 0%;"></div>
                                </div>
                                <span>0%</span> 
                            </div>
                        </td>
                        <td class="favorite-cell">
                            <div class="favorite-actions">
                                <span class="topic-favorite star-icon"><i class="far fa-star"></i></span>
                                <button class="delete-question-btn" 
                                    data-question-id="${question_id}"
                                    data-subject-id="${subject_id}"
                                    data-unit-id="${unit_id}"
                                    title="刪除題目">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </td>
                    `;

                    // 加到表格
                    topicTableBody.appendChild(newRow);

                    // 更新本地資料
                    if (Array.isArray(allQuestions.questions)) {
                        allQuestions.questions.push({
                            question_id: question_id,
                            Q: question_data.Q,
                            O1: question_data.O1,
                            O2: question_data.O2,
                            O3: question_data.O3,
                            O4: question_data.O4,
                            ...(question_data.O5 ? { O5: question_data.O5 } : {}),
                            A: question_data.A,
                            answer_rate: 0,
                            star: 0
                        });
                    }

                    fetch('/chapter', {
                        // 直接 POST 到 /chapter，帶題目資料
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(allQuestions)
                    })

                    // 重新排序與動畫
                    sortTable();

                } else {
                    alert('題目新增失敗！');
                }
            })
            .catch(() => {
                alert('伺服器錯誤，請稍後再試');
            });

            addTopicDialog.close();
            addTopicForm.reset();
        });
    }
    // --- End of Add Topic Dialog Logic ---

    // ---Start of delete the unit ---
    const deleteUnitBtn = document.getElementById('deleteUnitBtn');
    if (deleteUnitBtn) {
        deleteUnitBtn.addEventListener('click', function() {
            if (!confirm('確定要刪除此單元嗎？此操作無法復原，且會刪除所有題目！')) return;

            // 取得 subject_id, unit_id
            const subject_id = allQuestions.subject_id;
            const unit_id = allQuestions.unit_id;

            fetch('/delete_unit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject_id, unit_id })
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    alert('單元已刪除！');
                    window.location.href = '/sets';
                } else {
                    alert('刪除失敗，請稍後再試');
                }
            })
            .catch(() => {
                alert('伺服器錯誤，請稍後再試');
            });
        });
    }
    // --- End of delete the unit ---

    // --- Start of 刪除題目功能 ---
    document.getElementById('topic-table-body').addEventListener('click', function(e) {
        const btn = e.target.closest('.delete-question-btn');
        if (btn) {
            // 阻止所有冒泡與預設行為
            e.stopPropagation();
            e.preventDefault();

            const questionId = btn.getAttribute('data-question-id');
            const subjectId = btn.getAttribute('data-subject-id');
            const unitId = btn.getAttribute('data-unit-id');
            if (!confirm(`確定要刪除題目「${questionId}」嗎？此操作無法復原。`)) return;

            fetch('/delete_question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_id: subjectId,
                    unit_id: unitId,
                    question_id: questionId
                })
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    // 移除該列
                    btn.closest('tr').remove();
                } else {
                    alert('刪除失敗，請稍後再試');
                }
            })
            .catch(() => {
                alert('伺服器錯誤，請稍後再試');
            });
        }
    }, true); 

    const deleteHeaderBtn = document.querySelector('.delete-question-header-btn');
    if (deleteHeaderBtn) {
        document.querySelector('.delete-question-header-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            // 這裡可以加你要的功能，或什麼都不做（純裝飾用）
        }, true); 
    }

    // --- End of delete question functionality ---


    // --- Initial Setup ---

    // Perform the initial sort of the table when the page loads
    // This populates the table and also calls updateSortedQuestions internally.
    sortTable(); 

    window.addEventListener('popstate', function(event) {
        window.location.replace('/sets');
    });
});