// Game State Variables
let currentPattern = [];
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let missedCount = 0;

let timerInterval;
let timeLeft;
let difficultySettings = {
    easy: 15,
    medium: 10,
    hard: 5
};
let currentDifficulty = 'medium';
let soundEnabled = true;

// Data Structure for Questions
const allQuestions = [
    { q: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], a: 0 },
    { q: "Which property is used to change the background color in CSS?", options: ["color", "bgcolor", "background-color", "bg-color"], a: 2 },
    { q: "What is the correct syntax to output 'Hello World' in JavaScript?", options: ["print('Hello World')", "console.log('Hello World')", "echo 'Hello World'", "document.write('Hello World')"], a: 1 },
    { q: "Which CSS framework is known for its utility-first approach?", options: ["Bootstrap", "Materialize", "Tailwind CSS", "Bulma"], a: 2 },
    { q: "What does CORS stand for?", options: ["Cross-Origin Resource Sharing", "Centralized Object Rendering System", "Cross-Object Routing Service", "Core Origin Rendering System"], a: 0 },
    { q: "Which HTTP method is used to update an existing resource completely?", options: ["POST", "PATCH", "PUT", "UPDATE"], a: 2 },
    { q: "What is the time complexity of binary search?", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], a: 2 },
    { q: "Which data structure uses LIFO (Last In, First Out)?", options: ["Queue", "Stack", "Tree", "Graph"], a: 1 },
    { q: "What keyword is used to declare a constant in block scope?", options: ["const", "var", "let", "static"], a: 0 },
    { q: "Which operator is used for strict equality comparison?", options: ["=", "==", "===", "!=="], a: 2 },
    { q: "Which HTML5 tag is used for the largest heading?", options: ["<head>", "<h6>", "<h1>", "<heading>"], a: 2 },
    { q: "What describes Flexbox best?", options: ["Grid layout system", "1D layout model", "2D layout model", "Block modifier system"], a: 1 }
];

let selectedQuestions = [];
let userAnswers = []; // Store user answers for review
let isFetching = false;
let apiCategories = [];

async function fetchCategories() {
    try {
        const response = await fetch('https://opentdb.com/api_category.php');
        const data = await response.json();
        if (data.trivia_categories) {
            apiCategories = data.trivia_categories;
        }
    } catch (error) {
        console.error("Failed to fetch categories:", error);
    }
}

// Fetch categories on load
fetchCategories();

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    review: document.getElementById('review-screen')
};

// Start Screen elements
const diffBtns = document.querySelectorAll('.diff-btn');
const timeInfoText = document.getElementById('time-info-text');
const topicInput = document.getElementById('topic-input');
const startBtn = document.getElementById('start-btn');
const soundToggle = document.getElementById('sound-toggle');
const highScoreContainer = document.getElementById('high-score-container');
const highScoreVal = document.getElementById('high-score-val');

// Quiz Screen elements
const currentQNum = document.getElementById('current-q-num');
const totalQNum = document.getElementById('total-q-num');
const quizProgress = document.getElementById('quiz-progress');
const currentScore = document.getElementById('current-score');
const timeLeftDisplay = document.getElementById('time-left');
const timerPath = document.getElementById('timer-path');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');

// Result Screen elements
const finalScore = document.getElementById('final-score');
const correctAnswersStat = document.getElementById('correct-answers');
const wrongAnswersStat = document.getElementById('wrong-answers');
const missedAnswersStat = document.getElementById('missed-answers');
const restartBtn = document.getElementById('restart-btn');
const reviewBtn = document.getElementById('review-btn');

// Review Screen elements
const closeReviewBtn = document.getElementById('close-review-btn');
const reviewList = document.getElementById('review-list');

// --- Audio System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration) {
    if (!soundEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
    correct: () => {
        playTone(600, 'sine', 0.1);
        setTimeout(() => playTone(800, 'sine', 0.15), 100);
    },
    wrong: () => {
        playTone(300, 'sawtooth', 0.1);
        setTimeout(() => playTone(200, 'sawtooth', 0.2), 100);
    },
    tick: () => playTone(800, 'triangle', 0.05),
    click: () => playTone(400, 'sine', 0.05),
    timeout: () => playTone(150, 'square', 0.3)
};

// --- Initialization ---

function init() {
    // Check Local Storage for High Score
    const savedHighScore = localStorage.getItem('timeSprintHighScore');
    if (savedHighScore) {
        highScoreContainer.classList.remove('display-none');
        highScoreVal.textContent = savedHighScore;
    }

    // Event Listeners
    diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sounds.click();
            diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDifficulty = btn.dataset.level;
            timeInfoText.textContent = `Time per question: ${difficultySettings[currentDifficulty]}s`;
        });
    });

    soundToggle.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
        if(soundEnabled) sounds.click();
    });

    startBtn.addEventListener('click', startQuiz);
    nextBtn.addEventListener('click', () => {
        sounds.click();
        handleNextQuestion();
    });
    
    restartBtn.addEventListener('click', () => {
        sounds.click();
        switchScreen('start');
    });

    reviewBtn.addEventListener('click', () => {
        sounds.click();
        populateReviewScreen();
        switchScreen('review');
    });

    closeReviewBtn.addEventListener('click', () => {
        sounds.click();
        switchScreen('result');
    });
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function decodeHTMLEntities(text) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}

async function startQuiz() {
    if (isFetching) return;
    sounds.click();
    
    isFetching = true;
    const originalText = startBtn.textContent;
    startBtn.textContent = "Loading...";
    
    // Reset variables
    score = 0;
    correctCount = 0;
    wrongCount = 0;
    missedCount = 0;
    currentQuestionIndex = 0;
    userAnswers = [];
    
    let categoryId = 'any';
    const topicText = topicInput.value.trim().toLowerCase();
    
    if (topicText && apiCategories.length > 0) {
        // Try to match the typed topic with available openTDB categories
        const matchedCategory = apiCategories.find(c => c.name.toLowerCase().includes(topicText));
        if (matchedCategory) {
            categoryId = matchedCategory.id;
        }
    }
    
    try {
        if (categoryId === 'any' || !navigator.onLine) {
            let shuffled = shuffle([...allQuestions]);
            selectedQuestions = shuffled.slice(0, 10);
        } else {
            const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${categoryId}&type=multiple`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                selectedQuestions = data.results.map(item => {
                    const formattedQ = decodeHTMLEntities(item.question);
                    const correctAns = decodeHTMLEntities(item.correct_answer);
                    const incorrectAns = item.incorrect_answers.map(decodeHTMLEntities);
                    
                    const allOptions = shuffle([...incorrectAns, correctAns]);
                    const correctIndex = allOptions.indexOf(correctAns);
                    
                    return {
                        q: formattedQ,
                        options: allOptions,
                        a: correctIndex
                    };
                });
            } else {
                let shuffled = shuffle([...allQuestions]);
                selectedQuestions = shuffled.slice(0, 10);
            }
        }
        
        totalQNum.textContent = selectedQuestions.length;
        currentScore.textContent = '0';
        
        startBtn.textContent = originalText;
        isFetching = false;
        switchScreen('quiz');
        loadQuestion();
        
    } catch (error) {
        console.error("Failed to fetch questions:", error);
        let shuffled = shuffle([...allQuestions]);
        selectedQuestions = shuffled.slice(0, 10);
        
        totalQNum.textContent = selectedQuestions.length;
        currentScore.textContent = '0';
        
        startBtn.textContent = originalText;
        isFetching = false;
        switchScreen('quiz');
        loadQuestion();
    }
}

function loadQuestion() {
    // Reset UI for the new question
    nextBtn.classList.add('display-none');
    optionsContainer.innerHTML = '';
    
    const currentQ = selectedQuestions[currentQuestionIndex];
    currentQNum.textContent = currentQuestionIndex + 1;
    
    // Update progress bar
    const progressPerc = ((currentQuestionIndex) / selectedQuestions.length) * 100;
    quizProgress.style.width = `${progressPerc}%`;

    // Render Question
    questionText.textContent = currentQ.q;
    
    // Render Options
    const letters = ['A', 'B', 'C', 'D'];
    currentQ.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="option-letter">${letters[index]}</span><span class="option-text">${opt}</span>`;
        btn.addEventListener('click', () => handleAnswerSelect(index, btn));
        optionsContainer.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    const maxTime = difficultySettings[currentDifficulty];
    timeLeft = maxTime;
    timeLeftDisplay.textContent = timeLeft;
    timerPath.style.strokeDashoffset = '0';
    document.querySelector('.timer-circle').classList.remove('timer-danger');
    
    timerPath.style.transition = 'none'; // reset transition
    setTimeout(() => {
        timerPath.style.transition = `stroke-dashoffset 1s linear`;
    }, 10);

    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftDisplay.textContent = timeLeft;
        
        // Calculate offset (176 is the dasharray length approx)
        const offset = 176 - (timeLeft / maxTime) * 176;
        timerPath.style.strokeDashoffset = offset;

        if (timeLeft <= 3 && timeLeft > 0) {
            document.querySelector('.timer-circle').classList.add('timer-danger');
            sounds.tick();
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeOut();
        }
    }, 1000);
}

function handleAnswerSelect(selectedIndex, btnElement) {
    clearInterval(timerInterval); // Stop timer
    
    const currentQ = selectedQuestions[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQ.a;
    
    // Disable all buttons
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(btn => {
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';
    });

    if (isCorrect) {
        btnElement.classList.add('correct');
        sounds.correct();
        
        // Calculate score based on time remaining and difficulty
        let basePoints = 10;
        let timeBonus = timeLeft * (currentDifficulty === 'hard' ? 3 : currentDifficulty === 'medium' ? 2 : 1);
        score += basePoints + timeBonus;
        correctCount++;
        
    } else {
        btnElement.classList.add('wrong');
        btnElement.classList.add('shake');
        sounds.wrong();
        wrongCount++;
        
        // Highlight correct answer
        allBtns[currentQ.a].classList.add('correct');
    }

    // Save answer for review
    userAnswers.push({
        qIndex: currentQuestionIndex,
        selected: selectedIndex,
        correct: currentQ.a,
        timeEnded: false
    });

    // Update Score UI
    currentScore.textContent = score;

    // Show Next Button
    nextBtn.classList.remove('display-none');
}

function handleTimeOut() {
    sounds.timeout();
    missedCount++;
    
    const currentQ = selectedQuestions[currentQuestionIndex];
    
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(btn => {
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';
    });
    
    // Highlight correct answer
    allBtns[currentQ.a].classList.add('correct');
    
    questionText.classList.add('shake');
    setTimeout(() => questionText.classList.remove('shake'), 500);

    // Save answer as missed
    userAnswers.push({
        qIndex: currentQuestionIndex,
        selected: null,
        correct: currentQ.a,
        timeEnded: true
    });

    // Show Next Button
    nextBtn.classList.remove('display-none');
}

function handleNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < selectedQuestions.length) {
        loadQuestion();
    } else {
        endQuiz();
    }
}

function endQuiz() {
    clearInterval(timerInterval);
    
    // Complete progress bar
    quizProgress.style.width = '100%';
    
    setTimeout(() => {
        // Prepare Result Screen
        finalScore.textContent = score;
        correctAnswersStat.textContent = correctCount;
        wrongAnswersStat.textContent = wrongCount;
        missedAnswersStat.textContent = missedCount;

        // Save High Score
        const savedHighScore = localStorage.getItem('timeSprintHighScore');
        if (!savedHighScore || score > parseInt(savedHighScore)) {
            localStorage.setItem('timeSprintHighScore', score);
        }

        switchScreen('result');
        if(correctCount > selectedQuestions.length/2) {
            sounds.correct(); // winner sound
            setTimeout(sounds.correct, 200);
        } else {
            sounds.wrong(); // loser sound
        }
        
    }, 500);
}

function populateReviewScreen() {
    reviewList.innerHTML = '';
    
    userAnswers.forEach((ansData, index) => {
        const q = selectedQuestions[ansData.qIndex];
        const isCorrect = ansData.selected === ansData.correct;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'review-correct' : 'review-wrong'}`;
        
        let yourAnswerHTML = '';
        if (ansData.timeEnded) {
            yourAnswerHTML = `<div class="review-answer answer-yours wrong">Your Answer: <span style="opacity:0.7">[Time Out]</span></div>`;
        } else {
            yourAnswerHTML = `<div class="review-answer answer-yours ${isCorrect ? 'correct' : 'wrong'}">Your Answer: ${q.options[ansData.selected]}</div>`;
        }

        let correctAnswerHTML = '';
        if (!isCorrect) {
            correctAnswerHTML = `<div class="review-answer answer-correct">Correct Answer: ${q.options[ansData.correct]}</div>`;
        }
        
        reviewItem.innerHTML = `
            <div class="review-question">Q${index + 1}. ${q.q}</div>
            ${yourAnswerHTML}
            ${correctAnswerHTML}
        `;
        
        reviewList.appendChild(reviewItem);
    });
}

function switchScreen(screenName) {
    // Hide all
    Object.values(screens).forEach(screen => {
        screen.classList.add('display-none');
        screen.classList.remove('active');
    });
    
    // Show target
    if(screens[screenName]) {
        screens[screenName].classList.remove('display-none');
        // trigger reflow
        void screens[screenName].offsetWidth;
        screens[screenName].classList.add('active');
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
