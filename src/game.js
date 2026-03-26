import adinkraheneImg from "./assets/assets/Adinkrahene.png";
import akomaImg from "./assets/assets/Akoma.png";
import asaseYeDuruImg from "./assets/assets/Asase_Ye_Duru.png";
import ayaImg from "./assets/assets/Aya.png";
import gyeNyameImg from "./assets/assets/Gye_Nyame.png";
import sankofaAkomaImg from "./assets/assets/Sankofa_Akoma.png";
import sankofaImg from "./assets/assets/Sankofa.png";
import tamfoBebreImg from "./assets/assets/Tamfo_Bebre.png";

import { getCurrentUserId } from "./auth.js";
import { renderCompetitionLeaderboard } from "./components/CompetitionLeaderboard.js";
import { renderLeaderboard } from "./components/Leaderboard.js";
import { saveScore } from "./services/leaderboardService.js";

import {
  getCompetitionEntry,
  getCompetitionWeekContext,
  saveCompetitionEntry
} from "./services/competitionService.js";

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
const competitionEntryPanel = document.getElementById("competition-entry-panel");
const competitionEntryMessage = document.getElementById("competition-entry-message");
const competitionLeaderboardContainer = document.getElementById("competitionLeaderboard");
const competitionPlayerRankContainer = document.getElementById("competition-player-rank");
const competitionPhoneInput = document.getElementById("competitionPhoneInput");
const competitionJoinBtn = document.getElementById("competitionJoinBtn");
const competitionSkipBtn = document.getElementById("competitionSkipBtn");
const DEFAULT_COMPETITION_JOIN_LABEL = "Join Competition";
const UPDATE_COMPETITION_JOIN_LABEL = "Update Competition Score";

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
let pendingCompetitionEntry = null;

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
  competitionEntryPanel.classList.add("hidden");
  competitionLeaderboardContainer.classList.add("hidden");
  competitionLeaderboardContainer.innerHTML = "";
  competitionPlayerRankContainer.classList.add("hidden");
  competitionPlayerRankContainer.innerHTML = "";
  playerInput.classList.remove("hidden");
  playerNameInput.focus();
}

function setCompetitionEntryMessage(message, isError = false) {
  competitionEntryMessage.textContent = message;
  competitionEntryMessage.classList.toggle("competition-message-error", isError);
}

function normalizeContactPhoneNumber(value) {
  const compactValue = value.replace(/\s+/g, "");
  return compactValue.length >= 7 ? compactValue : null;
}

function buildCompetitionEntryMessage() {
  const { weekEndingDate } = getCompetitionWeekContext();
  return `Enter your phone number to join the weekly competition for the week ending ${weekEndingDate}.\nPrizes: 1st - 100 Cedis, 2nd - 50 Cedis, 3rd - 20 Cedis.`;
}

function buildCompetitionAlreadyEnteredMessage(existingEntry) {
  const { weekEndingDate } = getCompetitionWeekContext();
  return `You are already entered in this week's competition ending ${weekEndingDate}. Current competition score: ${existingEntry.score} points.`;
}

function setCompetitionActionState({
  phoneNumber = "",
  phoneDisabled = false,
  joinHidden = false,
  skipHidden = false,
  joinDisabled = false,
  skipDisabled = false,
  joinLabel = DEFAULT_COMPETITION_JOIN_LABEL
} = {}) {
  competitionPhoneInput.value = phoneNumber;
  competitionPhoneInput.disabled = phoneDisabled;
  competitionJoinBtn.textContent = joinLabel;
  competitionJoinBtn.classList.toggle("hidden", joinHidden);
  competitionSkipBtn.classList.toggle("hidden", skipHidden);
  competitionJoinBtn.disabled = joinDisabled;
  competitionSkipBtn.disabled = skipDisabled;
}

async function showCompetitionLeaderboard(currentUserId) {
  await renderCompetitionLeaderboard({ currentUserId });
  competitionLeaderboardContainer.classList.remove("hidden");
}

async function handleCompetitionJoin() {
  if (!pendingCompetitionEntry) {
    setCompetitionEntryMessage(
      "Save your score first before entering the competition.",
      true
    );
    return;
  }

  const phoneNumber = normalizeContactPhoneNumber(
    competitionPhoneInput.value.trim()
  );

  if (!phoneNumber) {
    setCompetitionEntryMessage(
      "Enter a valid phone number before joining the competition.",
      true
    );
    return;
  }

  competitionJoinBtn.disabled = true;
  competitionSkipBtn.disabled = true;

  let result;

  try {
    result = await saveCompetitionEntry({
      ...pendingCompetitionEntry,
      phoneNumber
    });
  } catch (error) {
    console.error("Competition entry failed:", error);
    setCompetitionEntryMessage(
      "Score could not be saved. Please try again later.",
      true
    );
    competitionJoinBtn.disabled = false;
    competitionSkipBtn.disabled = false;
    return;
  }

  if (!result.ok) {
    const message =
      result.reason === "competition_closed"
        ? "This week's competition is closed, so your entry was not submitted. Please try again when the next competition opens."
        : "Score could not be saved. Please try again later.";
    setCompetitionEntryMessage(message, true);
    competitionJoinBtn.disabled = false;
    competitionSkipBtn.disabled = false;
    return;
  }

  pendingCompetitionEntry = null;
  setCompetitionActionState({
    phoneNumber,
    phoneDisabled: true,
    joinHidden: true,
    skipHidden: true
  });
  setCompetitionEntryMessage(
    result.status === "improved"
      ? "Your competition entry has been updated. The live top 3 is below."
      : result.status === "unchanged"
        ? "Your current competition entry is still better. The live top 3 is below."
        : "You are already entered in this week's competition. The live top 3 is below."
  );
  await showCompetitionLeaderboard(getCurrentUserId());
  resultsMessage.textContent =
    result.status === "improved"
      ? "Your competition score has been updated. The live top 3 is below."
      : "You are entered in this week's competition. The live top 3 is below.";
  showBanner(
    result.status === "improved"
      ? `Your weekly competition entry for ${getCompetitionWeekContext().weekEndingDate} has been updated.`
      : `You have joined the weekly competition for the week ending ${getCompetitionWeekContext().weekEndingDate}.`
  );
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

  const wasSaved = await saveScore({
    userId,
    playerName,
    completionTimeSeconds,
    attempts
  });

  if (!wasSaved) {
    resultsMessage.textContent =
      "We are sorry we could not save your score right now. Try again after a while.";
    return;
  }

  scoreSubmitted = true;
  pendingCompetitionEntry = {
    userId,
    playerName,
    completionTimeSeconds,
    attempts
  };

  await renderLeaderboard();
  const existingCompetitionEntry = await getCompetitionEntry(userId);

  playerInput.classList.add("hidden");
  leaderboardContainer.classList.remove("hidden");

  if (existingCompetitionEntry) {
    competitionEntryPanel.classList.remove("hidden");
    setCompetitionActionState({
      phoneNumber: existingCompetitionEntry.phoneNumber ?? "",
      phoneDisabled: true,
      joinHidden: false,
      skipHidden: false,
      joinDisabled: false,
      skipDisabled: false,
      joinLabel: UPDATE_COMPETITION_JOIN_LABEL
    });
    setCompetitionEntryMessage(
      buildCompetitionAlreadyEnteredMessage(existingCompetitionEntry)
    );
    await showCompetitionLeaderboard(userId);
    resultsMessage.textContent =
      "You are already entered in this week's competition. The live top 3 is below.";
  } else {
    competitionEntryPanel.classList.remove("hidden");
    competitionLeaderboardContainer.classList.add("hidden");
    competitionLeaderboardContainer.innerHTML = "";
    competitionPlayerRankContainer.classList.add("hidden");
    competitionPlayerRankContainer.innerHTML = "";
    setCompetitionActionState();
    setCompetitionEntryMessage(buildCompetitionEntryMessage());
    resultsMessage.textContent =
      "Your score was saved. You can enter the weekly competition or play again.";
  }

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
  competitionEntryPanel.classList.add("hidden");
  competitionLeaderboardContainer.classList.add("hidden");
  competitionLeaderboardContainer.innerHTML = "";
  competitionPlayerRankContainer.classList.add("hidden");
  competitionPlayerRankContainer.innerHTML = "";
  setCompetitionActionState();
  pendingCompetitionEntry = null;
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

  competitionJoinBtn.addEventListener("click", () => {
    handleCompetitionJoin();
  });

  competitionSkipBtn.addEventListener("click", () => {
    competitionEntryPanel.classList.add("hidden");
    pendingCompetitionEntry = null;
    resultsMessage.textContent =
      "Your score was saved. Play again or view the intro.";
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
