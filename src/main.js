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
    <div class="intro-shell">
      <p class="screen-kicker">Adinkra Challenge</p>
      <h1>Adinkra Symbols</h1>
      <p class="intro-lead">
        Match sacred Akan symbols, learn their meanings, and climb the weekly leaderboard.
      </p>

      <div class="intro-story">
        <p>
          Adinkra symbols are visual symbols from the Akan people of Ghana. Each
          symbol represents a concept, proverb, or life philosophy.
        </p>
        <p>
          Today, Adinkra symbols remain powerful expressions of African wisdom,
          culture, identity, and resilience.
        </p>
      </div>

      <div class="prize-strip" aria-label="Weekly prizes">
        <article class="prize-card">
          <span class="prize-medal">🥇</span>
          <strong>100 Cedis</strong>
          <span>1st Place</span>
        </article>
        <article class="prize-card">
          <span class="prize-medal">🥈</span>
          <strong>50 Cedis</strong>
          <span>2nd Place</span>
        </article>
        <article class="prize-card">
          <span class="prize-medal">🥉</span>
          <strong>20 Cedis</strong>
          <span>3rd Place</span>
        </article>
      </div>

      <div class="game-instructions">
        <h2>How to Play</h2>
        <ol>
          <li>Click on a card to reveal an Adinkra symbol.</li>
          <li>Find the matching symbol.</li>
          <li>Matched pairs stay open to reveal the symbol's name and meaning.</li>
          <li>Finish quickly with fewer attempts to improve your rank.</li>
        </ol>
      </div>

      <button class="skip-intro-btn">Start Game</button>
    </div>
  </div>

  <div id="game-screen" class="hidden">
    <div class="game-shell">
      <div class="game-topbar">
        <div>
          <p class="screen-kicker">Live Round</p>
          <h1>Adinkra Game</h1>
        </div>
      </div>

      <div id="game-board"></div>

      <div class="game-actions">
        <button id="restart-btn">Restart Game</button>
        <button id="show-intro-btn">View Intro</button>
      </div>

      <div class="info-panel">
        <p class="info-panel-label">Matched Meanings</p>
        <ul id="matched-list"></ul>
      </div>
    </div>
  </div>

  <div id="results-screen" class="hidden">
    <div class="results-shell">
      <p class="results-kicker">Leaderboard Run</p>
      <h1>Game Complete</h1>
      <p id="results-message">
        Enter your name and phone number to save this run and compare it against the leaderboard.
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
        <input
          id="playerPhoneInput"
          type="tel"
          placeholder="+23355XXXX078"
          maxlength="16"
          autocomplete="tel"
        />
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
