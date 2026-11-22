const QUESTION_TIME_LIMIT = 15;
const BEST_SCORE_STORAGE_KEY = "quiz_app_best_score";

class Question {
    /**
     * @param {string} text
     * @param {string} correctAnswer
     * @param {string[]} incorrectAnswers
     */
    constructor(text, correctAnswer, incorrectAnswers) {
        this.text = text;
        this.correctAnswer = correctAnswer;
        this.options = Question.shuffle([correctAnswer, ...incorrectAnswers]);
    }

    static shuffle(items) {
        const array = [...items];
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

class Quiz {
    /**
     * @param {Question[]} questions
     */
    constructor(questions) {
        this.questions = questions;
        this.currentIndex = 0;
        this.score = 0;
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    checkAnswer(answer) {
        const current = this.getCurrentQuestion();
        const isCorrect = answer === current.correctAnswer;
        if (isCorrect) {
            this.score += 1;
        }
        return isCorrect;
    }

    nextQuestion() {
        this.currentIndex += 1;
    }

    isFinished() {
        return this.currentIndex >= this.questions.length;
    }
}

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultsScreen = document.getElementById("results-screen");

const categorySelect = document.getElementById("category-select");
const difficultySelect = document.getElementById("difficulty-select");
const startBtn = document.getElementById("start-btn");
const bestScoreText = document.getElementById("best-score-text");
const loadingMessage = document.getElementById("loading-message");
const errorContainer = document.getElementById("error-container");
const errorMessage = document.getElementById("error-message");
const tryAgainBtn = document.getElementById("try-again-btn");

const progressText = document.getElementById("progress-text");
const timerText = document.getElementById("timer-text");
const scoreText = document.getElementById("score-text");
const questionText = document.getElementById("question-text");
const answersContainer = document.getElementById("answers-container");
const nextBtn = document.getElementById("next-btn");

const finalScore = document.getElementById("final-score");
const finalPercentage = document.getElementById("final-percentage");
const performanceMessage = document.getElementById("performance-message");
const playAgainBtn = document.getElementById("play-again-btn");

let currentQuiz = null;
let timerId = null;
let timeRemaining = QUESTION_TIME_LIMIT;
let isFetching = false;

function showScreen(screenToShow) {
    startScreen.hidden = screenToShow !== startScreen;
    quizScreen.hidden = screenToShow !== quizScreen;
    resultsScreen.hidden = screenToShow !== resultsScreen;
}

function getBestScore() {
    const saved = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    if (saved === null) {
        return null;
    }
    const parsed = Number(saved);
    return Number.isNaN(parsed) ? null : parsed;
}

function updateBestScoreDisplay() {
    const best = getBestScore();
    if (best !== null) {
        bestScoreText.textContent = `Best Score: ${best} / 10`;
        bestScoreText.hidden = false;
    } else {
        bestScoreText.hidden = true;
    }
}

function saveBestScore(score) {
    const currentBest = getBestScore();
    if (currentBest === null || score > currentBest) {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(score));
    }
}

const questionsCount = 10;
async function fetchQuestions() {
    const response = await fetch(`https://opentdb.com/api.php?amount=${questionsCount}`);
    if (!response.ok) {
        throw new Error("Could not reach the quiz server. Please try again.");
    }

    const data = await response.json();
    if (data.response_code === 1) {
        throw new Error("Not enough questions for that category and difficulty. Try another option.");
    }
    if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length === 0) {
        throw new Error("Failed to load quiz questions. Please wait a few seconds and try again.");
    }

    return data.results.map((item) => {
        const text = decodeURIComponent(item.question);
        const correct = decodeURIComponent(item.correct_answer);
        const incorrect = item.incorrect_answers.map((ans) => decodeURIComponent(ans));
        return new Question(text, correct, incorrect);
    });
}

function clearTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

function revealCorrectAnswer() {
    const current = currentQuiz.getCurrentQuestion();
    const buttons = answersContainer.querySelectorAll("button");
    buttons.forEach((btn) => {
        btn.disabled = true;
        if (btn.textContent === current.correctAnswer) {
            btn.classList.add("correct");
        }
    });
}

function handleTimeUp() {
    clearTimer();
    timerText.textContent = "0s";
    timerText.classList.add("timer-warning");
    revealCorrectAnswer();
    nextBtn.hidden = false;
}

function startTimer() {
    clearTimer();
    timeRemaining = QUESTION_TIME_LIMIT;
    timerText.textContent = `${timeRemaining}s`;
    timerText.classList.remove("timer-warning");

    timerId = setInterval(() => {
        timeRemaining -= 1;
        timerText.textContent = `${timeRemaining}s`;
        if (timeRemaining <= 5) {
            timerText.classList.add("timer-warning");
        }
        if (timeRemaining <= 0) {
            handleTimeUp();
        }
    }, 1000);
}

function handleAnswerClick(selectedButton, selectedAnswer) {
    clearTimer();
    const isCorrect = currentQuiz.checkAnswer(selectedAnswer);

    if (isCorrect) {
        selectedButton.classList.add("correct");
    } else {
        selectedButton.classList.add("wrong");
    }

    revealCorrectAnswer();
    scoreText.textContent = `Score: ${currentQuiz.score}`;
    nextBtn.hidden = false;
}

function renderQuestion() {
    const question = currentQuiz.getCurrentQuestion();
    const total = currentQuiz.questions.length;

    progressText.textContent = `Question ${currentQuiz.currentIndex + 1} of ${total}`;
    scoreText.textContent = `Score: ${currentQuiz.score}`;
    questionText.textContent = question.text;
    nextBtn.hidden = true;
    nextBtn.textContent = currentQuiz.currentIndex === total - 1 ? "See Results" : "Next";

    answersContainer.innerHTML = "";
    question.options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-btn";
        button.textContent = option;
        button.addEventListener("click", () => handleAnswerClick(button, option));
        answersContainer.appendChild(button);
    });

    startTimer();
}

function showResults() {
    clearTimer();
    const total = currentQuiz.questions.length;
    const score = currentQuiz.score;
    const percentage = Math.round((score / total) * 100);

    finalScore.textContent = `Final Score: ${score} / ${total}`;
    finalPercentage.textContent = `${percentage}%`;

    if (percentage >= 80) {
        performanceMessage.textContent = "Great job!";
    } else if (percentage >= 50) {
        performanceMessage.textContent = "Good effort! Keep practicing.";
    } else {
        performanceMessage.textContent = "Better luck next time!";
    }

    saveBestScore(score);
    showScreen(resultsScreen);
}

async function startQuiz() {
    if (isFetching) {
        return;
    }

    isFetching = true;
    startBtn.disabled = true;
    tryAgainBtn.disabled = true;
    errorContainer.hidden = true;
    loadingMessage.hidden = false;

    try {
        const questions = await fetchQuestions(categorySelect.value, difficultySelect.value);
        currentQuiz = new Quiz(questions);
        showScreen(quizScreen);
        renderQuestion();
    } catch (error) {
        errorMessage.textContent = error.message || "Something went wrong. Please try again.";
        errorContainer.hidden = false;
    } finally {
        isFetching = false;
        startBtn.disabled = false;
        tryAgainBtn.disabled = false;
        loadingMessage.hidden = true;
    }
}

function handleNext() {
    clearTimer();
    currentQuiz.nextQuestion();
    if (currentQuiz.isFinished()) {
        showResults();
    } else {
        renderQuestion();
    }
}

function resetToStart() {
    clearTimer();
    currentQuiz = null;
    errorContainer.hidden = true;
    loadingMessage.hidden = true;
    updateBestScoreDisplay();
    showScreen(startScreen);
}

startBtn.addEventListener("click", startQuiz);
tryAgainBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", handleNext);
playAgainBtn.addEventListener("click", resetToStart);

updateBestScoreDisplay();
showScreen(startScreen);

