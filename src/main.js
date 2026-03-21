import "./styles/stylesheet.css";

import { renderLeaderboard } from "./components/Leaderboard.js";
import { initUser } from "./auth.js";


const currentUserId = await initUser();

if (!currentUserId) {
  console.error("Firebase auth did not initialize. Score submissions will fail.");
}

document.querySelector("#app").innerHTML = `
  <div id="app-banner" class="app-banner hidden"></div>

  <div id="intro-screen">
    <h1>Adinkra Symbols</h1>
    <p>
      Adinkra symbols are visual symbols from the Akan people of Ghana. Each
      symbol represents a concept, proverb, or life philosophy. Originating
      over 300 years ago, they were traditionally used by royalty during
      important ceremonies.
    </p>
    <p>
      Today, Adinkra symbols are recognized globally as powerful expressions
      of African wisdom, culture, and identity.
    </p>

    <div class="game-instructions">
      <h2>How to Play</h2>
      <ol>
        <li>Click on a card to reveal an Adinkra symbol.</li>
        <li>Find the matching symbol.</li>
        <li>Matched pairs stay open to reveal the symbol's name and meaning.</li>
        <li>Match all Adinkra symbols to win the game.</li>
      </ol>
    </div>

    <button class="skip-intro-btn">Start Game</button>
  </div>

  <div id="game-screen" class="hidden">
    <h1>Adinkra Game</h1>
    <div id="game-board"></div>

    <button id="restart-btn">Restart Game</button>
    <button id="show-intro-btn">View Intro</button>

    <div class="info-panel">
      <ul id="matched-list"></ul>
    </div>
  </div>

  <div id="results-screen" class="hidden">
    <div class="results-shell">
      <p class="results-kicker">Leaderboard Run</p>
      <h1>Game Complete</h1>
      <p id="results-message">
        Enter your name to see how your performance compares on the leaderboard.
      </p>

      <div class="results-stats">
        <div class="results-stat">
          <span class="results-stat-label">Attempts</span>
          <strong id="results-attempts">0</strong>
        </div>
        <div class="results-stat">
          <span class="results-stat-label">Time</span>
          <strong id="results-time">0s</strong>
        </div>
      </div>

      <div id="playerInput" class="results-entry">
        <input id="playerNameInput" placeholder="Enter your name" maxlength="24" />
        <button id="submitScore">Submit Score</button>
      </div>

      <div id="leaderboard" class="results-leaderboard hidden"></div>

      <div class="results-actions">
        <button id="play-again-btn" class="skip-intro-btn">Play Again</button>
        <button id="results-intro-btn">View Intro</button>
      </div>
    </div>
  </div>

  <footer>
    <p>&copy; 2026 BeitLechem Tech</p>
  </footer>
`;

await import("./game.js");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch(error => console.error("Service worker registration failed", error));
  });
}

renderLeaderboard();
