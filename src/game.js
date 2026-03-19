import adinkraheneImg from "./assets/assets/Adinkrahene.png";
import akomaImg from "./assets/assets/Akoma.png";
import asaseYeDuruImg from "./assets/assets/Asase_Ye_Duru.png";
import ayaImg from "./assets/assets/Aya.png";
import gyeNyameImg from "./assets/assets/Gye_Nyame.png";
import sankofaAkomaImg from "./assets/assets/Sankofa_Akoma.png";
import sankofaImg from "./assets/assets/Sankofa.png";
import tamfoBebreImg from "./assets/assets/Tamfo_Bebre.png";

import {
  completeCompetitionEmailLink,
  getCurrentUserId,
  getVerifiedEmail,
  isCompetitionEmailLink,
  sendCompetitionSignInLink
} from "./auth.js";
import {
  clearPendingCompetitionEntry,
  consumeCompetitionFlashMessage,
  getCompetitionWeekStatus,
  readPendingCompetitionEntry,
  saveCompetitionEntry,
  setCompetitionFlashMessage,
  stashPendingCompetitionEntry
} from "./services/competitionService.js";
import { renderCompetitionLeaderboard } from "./components/CompetitionLeaderboard.js";
import { renderLeaderboard } from "./components/Leaderboard.js";
import { saveScore } from "./services/leaderboardService.js";

const adinkraSymbols = [
  {
    symbol: gyeNyameImg,
    name: "Gye_Nyame",
    meaning:
      "Except God. A symbol expressing the omnipotence and supremacy of God.",
  },
  {
    symbol: sankofaImg,
    name: "Sankofa",
    meaning:
      "Go back and get it. A symbol of learning from the past to build the future.",
  },
  {
    symbol: sankofaAkomaImg,
    name: "Sankofa_Akoma",
    meaning:
      "An alternative Sankofa representation symbolizing returning to one's roots for wisdom.",
  },
  {
    symbol: adinkraheneImg,
    name: "Adinkrahene",
    meaning:
      "King of the Adinkra symbols. A symbol of authority, leadership, and charisma.",
  },
  {
    symbol: akomaImg,
    name: "Akoma",
    meaning: "The heart. A symbol of patience and tolerance.",
  },
  {
    symbol: asaseYeDuruImg,
    name: "Asase_Ye_Duru",
    meaning:
      " The earth has weight. A symbol of the divinity of the earth and the importance of nurturing it.",
  },
  {
    symbol: tamfoBebreImg,
    name: "Tamfo_Bebre",
    meaning:
      "Enemy of the wicked. A symbol of strength and courage to overcome adversaries.",
  },
  {
    symbol: ayaImg,
    name: "Aya",
    meaning: "Fern. A symbol of endurance and resourcefulness.",
  },
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
const competitionPanel = document.getElementById("competition-panel");
const competitionMessage = document.getElementById("competition-message");
const competitionEmailForm = document.getElementById("competition-email-form");
const competitionEmailInput = document.getElementById("competitionEmailInput");
const competitionOptInBtn = document.getElementById("competitionOptInBtn");
const competitionLinkedActions = document.getElementById("competition-linked-actions");
const competitionLinkedEmail = document.getElementById("competition-linked-email");
const competitionConfirmBtn = document.getElementById("competitionConfirmBtn");

const matchedSymbols = new Set(); // prevents duplicates
const cards = [...adinkraSymbols, ...adinkraSymbols]; // duplicate icons for pairs

//flip card
let flippedCards = [];
let lockBoard = false;
let attempts = 0;
let scoreSubmitted = false;
let gameStartTime = null;
let timerIntervalId = null;
let completionTimeSeconds = 0;
let lastSubmittedScore = null;
const scoreDisplay = document.createElement("p");

function startGame() {
  introScreen.classList.add("fade-out");

  setTimeout(() => {
    showGameScreen();
  }, 500); // matches CSS transition time
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

//render the board
function createBoard() {
  gameBoard.innerHTML = ""; // clear previous game

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

//MATCHING Logic
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
  } else {
    lockBoard = true;
    setTimeout(() => {
      card1.classList.remove("flipped");
      card2.classList.remove("flipped");
      flippedCards = [];
      lockBoard = false;
    }, 1000);
  }
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
  competitionPanel.classList.add("hidden");
  playerNameInput.focus();
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

function setCompetitionMessage(message, isError = false) {
  competitionMessage.textContent = message;
  competitionMessage.classList.toggle("competition-message-error", isError);
}

function getCompetitionPayload() {
  if (!lastSubmittedScore) {
    return null;
  }

  return {
    ...lastSubmittedScore,
    weekEndingDate: lastSubmittedScore.weekEndingDate
  };
}

async function updateCompetitionPanel() {
  const verifiedEmail = getVerifiedEmail();
  const weekStatus = await getCompetitionWeekStatus();

  competitionPanel.classList.remove("hidden");
  await renderCompetitionLeaderboard();

  if (weekStatus.status !== "open") {
    competitionEmailForm.classList.add("hidden");
    competitionLinkedActions.classList.add("hidden");
    setCompetitionMessage(
      `This week's competition closed at 8:00 AM Ghana time on ${weekStatus.weekEndingDate}. Winners are locked from the public leaderboard.`
    );
    return;
  }

  if (verifiedEmail) {
    competitionEmailForm.classList.add("hidden");
    competitionLinkedActions.classList.remove("hidden");
    competitionLinkedEmail.textContent = `Verified email: ${verifiedEmail}`;
    setCompetitionMessage(
      "Your verified email is ready. Use it to enter this week's top 3 reward race."
    );
    return;
  }

  competitionLinkedActions.classList.add("hidden");
  competitionEmailForm.classList.remove("hidden");
  setCompetitionMessage(
    "Verify your email to enter the weekly competition for 100, 50, and 20 cedis."
  );
}

async function submitCompetitionEntry(email) {
  const payload = getCompetitionPayload();

  if (!payload) {
    setCompetitionMessage(
      "Save your score first before entering the weekly competition.",
      true
    );
    return;
  }

  let result;

  try {
    result = await saveCompetitionEntry({
      uid: payload.userId,
      playerName: payload.playerName,
      email,
      completionTimeSeconds: payload.completionTimeSeconds,
      attempts: payload.attempts,
      weekEndingDate: payload.weekEndingDate
    });
  } catch (error) {
    console.error("❌ Could not save competition entry:", error);
    setCompetitionMessage(
      "We could not save your weekly competition entry right now.",
      true
    );
    return;
  }

  if (!result.ok) {
    if (result.reason === "competition_closed") {
      setCompetitionMessage(
        "This week's competition is closed. Watch the leaderboard for the final top 3."
      );
      await renderCompetitionLeaderboard();
      return;
    }

    setCompetitionMessage(
      "We could not save your weekly competition entry right now.",
      true
    );
    return;
  }

  if (result.status === "created") {
    setCompetitionMessage(
      `You are in. Your weekly challenge entry is locked for Saturday, ${payload.weekEndingDate}.`
    );
  } else if (result.status === "improved") {
    setCompetitionMessage(
      "Your weekly competition entry was updated because this run is better."
    );
  } else {
    setCompetitionMessage(
      "You are already entered for this week. Your previous entry is still your best one."
    );
  }

  await renderCompetitionLeaderboard();
}

async function handleCompetitionEmailRequest() {
  const payload = getCompetitionPayload();
  const email = competitionEmailInput.value.trim().toLowerCase();

  if (!payload) {
    setCompetitionMessage(
      "Save your score first before entering the weekly competition.",
      true
    );
    return;
  }

  if (!email) {
    setCompetitionMessage("Enter an email address to receive the verification link.", true);
    return;
  }

  competitionOptInBtn.disabled = true;

  try {
    stashPendingCompetitionEntry({
      ...payload,
      email
    });
    await sendCompetitionSignInLink(email);
    setCompetitionMessage(
      "Verification link sent. Open it on this same device to keep your weekly competition identity."
    );
  } catch (error) {
    console.error("❌ Could not send competition email link:", error);
    setCompetitionMessage(
      "We could not send the email link. Check the Firebase email-link settings and try again.",
      true
    );
  } finally {
    competitionOptInBtn.disabled = false;
  }
}

async function finalizeCompetitionLinkIfNeeded() {
  if (!isCompetitionEmailLink()) {
    return;
  }

  try {
    const linkedUser = await completeCompetitionEmailLink();
    const pendingEntry = readPendingCompetitionEntry();

    if (!linkedUser || !pendingEntry) {
      setCompetitionFlashMessage(
        "Your email was verified, but the weekly competition entry details were missing."
      );
      clearPendingCompetitionEntry();
      return;
    }

    const result = await saveCompetitionEntry({
      uid: linkedUser.uid,
      playerName: pendingEntry.playerName,
      email: linkedUser.email,
      completionTimeSeconds: pendingEntry.completionTimeSeconds,
      attempts: pendingEntry.attempts,
      weekEndingDate: pendingEntry.weekEndingDate
    });

    clearPendingCompetitionEntry();

    if (!result.ok) {
      setCompetitionFlashMessage(
        result.reason === "competition_closed"
          ? "Your email was verified, but this week's competition had already closed."
          : "Your email was verified, but we could not save the weekly competition entry."
      );
      return;
    }

    if (result.status === "unchanged") {
      setCompetitionFlashMessage(
        "Email verified. Your earlier weekly competition result is still your best one."
      );
      return;
    }

    setCompetitionFlashMessage(
      "Email verified. Your weekly competition entry is active for this Saturday's reward race."
    );
  } catch (error) {
    console.error("❌ Could not finish competition email verification:", error);
    setCompetitionFlashMessage(error.message);
    clearPendingCompetitionEntry();
  }
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

  scoreSubmitted = true;
  lastSubmittedScore = {
    userId,
    playerName,
    completionTimeSeconds,
    attempts,
    weekEndingDate: (await getCompetitionWeekStatus()).weekEndingDate
  };

  await renderLeaderboard();

  playerInput.classList.add("hidden");
  leaderboardContainer.classList.remove("hidden");
  await updateCompetitionPanel();
  resultsMessage.textContent =
    "Your score was saved. Here is the current leaderboard, plus this week's competition opt-in.";

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
  competitionPanel.classList.add("hidden");
  competitionEmailForm.classList.remove("hidden");
  competitionLinkedActions.classList.add("hidden");
  competitionEmailInput.value = "";
  competitionOptInBtn.disabled = false;
  competitionLinkedEmail.textContent = "";
  lastSubmittedScore = null;
  resultsAttempts.textContent = "0";
  resultsTime.textContent = "0s";
  resultsMessage.textContent =
    "Enter your name to see how your performance compares on the leaderboard.";
  setCompetitionMessage(
    "Opt in with your verified email to compete for this week's rewards."
  );
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

  competitionOptInBtn.addEventListener("click", () => {
    handleCompetitionEmailRequest();
  });

  competitionConfirmBtn.addEventListener("click", async () => {
    const verifiedEmail = getVerifiedEmail();

    if (!verifiedEmail) {
      setCompetitionMessage(
        "Verify your email first before entering the weekly competition.",
        true
      );
      return;
    }

    await submitCompetitionEntry(verifiedEmail);
  });

  finalizeCompetitionLinkIfNeeded().finally(() => {
    const flashMessage = consumeCompetitionFlashMessage();

    if (flashMessage) {
      showBanner(flashMessage);
    }
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
