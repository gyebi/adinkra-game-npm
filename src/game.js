import adinkraheneImg from "./assets/assets/Adinkrahene.png";
import akomaImg from "./assets/assets/Akoma.png";
import asaseYeDuruImg from "./assets/assets/Asase_Ye_Duru.png";
import ayaImg from "./assets/assets/Aya.png";
import gyeNyameImg from "./assets/assets/Gye_Nyame.png";
import sankofaAkomaImg from "./assets/assets/Sankofa_Akoma.png";
import sankofaImg from "./assets/assets/Sankofa.png";
import tamfoBebreImg from "./assets/assets/Tamfo_Bebre.png";

import { getCurrentUserId } from "./auth.js";
import { renderLeaderboard } from "./components/Leaderboard.js";
import { saveScore } from "./services/leaderboardService.js";

import { saveCompetitionEntry } from "./services/competitionService.js";

const adinkraSymbols = [
  {
    symbol: gyeNyameImg,
    name: "Gye_Nyame",
    meaning:
      "Except God. A symbol expressing the omnipotence and supremacy of God."
  },
  {
    symbol: sankofaImg,
    name: "Sankofa",
    meaning:
      "Go back and get it. A symbol of learning from the past to build the future."
  },
  {
    symbol: sankofaAkomaImg,
    name: "Sankofa_Akoma",
    meaning:
      "An alternative Sankofa representation symbolizing returning to one's roots for wisdom."
  },
  {
    symbol: adinkraheneImg,
    name: "Adinkrahene",
    meaning:
      "King of the Adinkra symbols. A symbol of authority, leadership, and charisma."
  },
  {
    symbol: akomaImg,
    name: "Akoma",
    meaning: "The heart. A symbol of patience and tolerance."
  },
  {
    symbol: asaseYeDuruImg,
    name: "Asase_Ye_Duru",
    meaning:
      " The earth has weight. A symbol of the divinity of the earth and the importance of nurturing it."
  },
  {
    symbol: tamfoBebreImg,
    name: "Tamfo_Bebre",
    meaning:
      "Enemy of the wicked. A symbol of strength and courage to overcome adversaries."
  },
  {
    symbol: ayaImg,
    name: "Aya",
    meaning: "Fern. A symbol of endurance and resourcefulness."
  }
];

const gameScreen = document.getElementById("game-screen");
const introScreen = document.getElementById("intro-screen");
const resultsScreen = document.getElementById("results-screen");
const skipBtn = document.querySelector(".skip-intro-btn");
const restartBtn = document.getElementById("restart-btn");
const showIntroBtn = document.getElementById("show-intro-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const resultsIntroBtn = document.getElementById("results-intro-btn");
const gameBoard = document.getElementById("game-board");
const matchedList = document.getElementById("matched-list");
const playerInput = document.getElementById("playerInput");
const playerNameInput = document.getElementById("playerNameInput");
const submitScoreBtn = document.getElementById("submitScore");
const leaderboardContainer = document.getElementById("leaderboard");
const resultsAttempts = document.getElementById("results-attempts");
const resultsTime = document.getElementById("results-time");
const resultsMessage = document.getElementById("results-message");
const appBanner = document.getElementById("app-banner");

const matchedSymbols = new Set();
const cards = [...adinkraSymbols, ...adinkraSymbols];

let flippedCards = [];
let lockBoard = false;
let attempts = 0;
let scoreSubmitted = false;
let gameStartTime = null;
let timerIntervalId = null;
let completionTimeSeconds = 0;
const scoreDisplay = document.createElement("p");

function startGame() {
  introScreen.classList.add("fade-out");

  setTimeout(() => {
    showGameScreen();
  }, 500);
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function createBoard() {
  gameBoard.innerHTML = "";

  shuffle(cards).forEach((cardData) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.symbol = cardData.symbol;
    card.innerHTML = `<img src="${cardData.symbol}" alt="" class="card-image">`;
    card.addEventListener("click", flipCard);
    gameBoard.appendChild(card);
  });
}

function flipCard() {
  if (lockBoard || this.classList.contains("flipped")) return;

  if (!gameStartTime) {
    startTimer();
  }

  this.classList.add("flipped");
  flippedCards.push(this);

  if (flippedCards.length === 2) {
    checkForMatch();
  }
}

function updateScore() {
  scoreDisplay.textContent = `Attempts: ${attempts} | Time: ${completionTimeSeconds}s`;
}

function startTimer() {
  gameStartTime = Date.now();
  completionTimeSeconds = 0;
  updateScore();

  timerIntervalId = window.setInterval(() => {
    completionTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    updateScore();
  }, 1000);
}

function stopTimer() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  if (gameStartTime) {
    completionTimeSeconds = Math.max(
      1,
      Math.floor((Date.now() - gameStartTime) / 1000)
    );
    updateScore();
  }
}

function getSymbolDataByPath(symbolPath) {
  return adinkraSymbols.find((item) => item.symbol === symbolPath);
}

function checkForMatch() {
  const [card1, card2] = flippedCards;
  attempts++;
  updateScore();

  if (card1.dataset.symbol === card2.dataset.symbol) {
    const symbolPath = card1.dataset.symbol;

    if (!matchedSymbols.has(symbolPath)) {
      matchedSymbols.add(symbolPath);
      const symbolData = getSymbolDataByPath(symbolPath);

      if (symbolData) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${symbolData.name}:</strong><br>${symbolData.meaning}`;
        matchedList.prepend(li);
      }
    }

    flippedCards = [];
    checkWin();
    return;
  }

  lockBoard = true;
  setTimeout(() => {
    card1.classList.remove("flipped");
    card2.classList.remove("flipped");
    flippedCards = [];
    lockBoard = false;
  }, 1000);
}

function checkWin() {
  const flippedCardsCount = document.querySelectorAll(".card.flipped").length;

  if (flippedCardsCount === cards.length) {
    stopTimer();

    setTimeout(() => {
      showResultsScreen();
    }, 500);
  }
}

function showBanner(message, isError = false) {
  if (!message) {
    appBanner.classList.add("hidden");
    appBanner.textContent = "";
    appBanner.classList.remove("app-banner-error");
    return;
  }

  appBanner.textContent = message;
  appBanner.classList.remove("hidden");
  appBanner.classList.toggle("app-banner-error", isError);
}

function showResultsScreen() {
  gameScreen.classList.add("hidden");
  introScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");
  resultsAttempts.textContent = `${attempts}`;
  resultsTime.textContent = `${completionTimeSeconds}s`;
  resultsMessage.textContent =
    "Enter your name to save this run and compare it against the top scores.";
  leaderboardContainer.classList.add("hidden");
  leaderboardContainer.innerHTML = "";
  playerInput.classList.remove("hidden");
  playerNameInput.focus();
}

submitScoreBtn.addEventListener("click", async () => {
  if (scoreSubmitted) return;

  const userId = getCurrentUserId();

  if (!userId) {
    resultsMessage.textContent =
      "Authentication is not ready yet. Please wait a moment and try again.";
    return;
  }

  let playerName = playerNameInput.value;

  if (!playerName || playerName.trim() === "") {
    playerName = "Anonymous";
  }

  console.log("🧠 Submitting player:", playerName);
/*
  const wasSaved = await saveScore({
    userId,
    playerName,
    completionTimeSeconds,
    attempts
  });

  if (!wasSaved) {
    resultsMessage.textContent =
      "We could not save your score right now. Check Firebase auth and Firestore access.";
    return;
  }
    */

  // Ask player if they want to join competition
const joinCompetition = confirm(
  "🏆 Do you want to join the weekly competition?\nTop players win rewards!"
);

// Always save leaderboard score
const wasSaved = await saveScore({
  userId,
  playerName,
  completionTimeSeconds,
  attempts
});

if (!wasSaved) {
  resultsMessage.textContent =
    "We could not save your score right now. Check Firebase auth and Firestore access.";
  return;
}

// ⭐ NEW: Save competition entry ONLY if user agrees
if (joinCompetition) {
  await saveCompetitionEntry({
    userId,
    playerName,
    completionTimeSeconds,
    attempts
  });

  console.log("🏆 Player joined competition");
}

  scoreSubmitted = true;

  await renderLeaderboard();

  playerInput.classList.add("hidden");
  leaderboardContainer.classList.remove("hidden");
  resultsMessage.textContent =
    "Your score was saved. Play again or view the intro.";

  console.log("✅ Score submitted from UI");
});

playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitScoreBtn.click();
  }
});

function resetGameState() {
  attempts = 0;
  scoreSubmitted = false;
  gameStartTime = null;
  completionTimeSeconds = 0;

  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  updateScore();
  flippedCards = [];
  lockBoard = false;
  matchedList.innerHTML = "";
  matchedSymbols.clear();
  gameBoard.innerHTML = "";
  playerInput.classList.remove("hidden");
  playerNameInput.value = "";
  leaderboardContainer.classList.add("hidden");
  leaderboardContainer.innerHTML = "";
  resultsAttempts.textContent = "0";
  resultsTime.textContent = "0s";
  resultsMessage.textContent =
    "Enter your name to see how your performance compares on the leaderboard.";
}

function showGameScreen() {
  introScreen.style.display = "none";
  resultsScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resetGameState();
  createBoard();
}

function showIntroScreen() {
  introScreen.classList.remove("fade-out");
  introScreen.style.display = "block";
  gameScreen.classList.add("hidden");
  resultsScreen.classList.add("hidden");
}

function initializeGame() {
  gameScreen.insertBefore(scoreDisplay, gameBoard);
  updateScore();

  skipBtn.addEventListener("click", () => {
    localStorage.setItem("introSeen", "true");
    localStorage.removeItem("skipIntro");
    startGame();
  });

  restartBtn.addEventListener("click", () => {
    resetGameState();
    createBoard();
  });

  showIntroBtn.addEventListener("click", () => {
    showIntroScreen();
  });

  playAgainBtn.addEventListener("click", () => {
    showGameScreen();
  });

  resultsIntroBtn.addEventListener("click", () => {
    showIntroScreen();
  });

  const introSeen =
    localStorage.getItem("introSeen") === "true" ||
    localStorage.getItem("skipIntro") === "true";

  if (introSeen) {
    showGameScreen();
  } else {
    showIntroScreen();
  }
}

initializeGame();
