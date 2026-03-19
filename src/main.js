import "./styles/stylesheet.css";

import akomaSymbol from "./assets/assets/Akoma.png";
import ayaSymbol from "./assets/assets/Aya.png";
import gyeNyameSymbol from "./assets/assets/Gye_Nyame.png";
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

      <section id="competition-panel" class="competition-panel hidden">
        <div class="competition-panel-header">
          <div class="competition-symbol-stack" aria-hidden="true">
            <img src="${gyeNyameSymbol}" alt="" />
            <img src="${akomaSymbol}" alt="" />
            <img src="${ayaSymbol}" alt="" />
          </div>
          <div>
            <p class="competition-kicker">Weekly Challenge</p>
            <h2>Enter The Saturday Reward Race</h2>
          </div>
        </div>

        <p id="competition-message" class="competition-message">
          Opt in with your verified email to compete for this week&apos;s rewards.
        </p>

        <div class="competition-rewards" aria-label="Competition rewards">
          <article class="competition-reward">
            <span class="competition-reward-place">1st</span>
            <strong>100 Cedis</strong>
          </article>
          <article class="competition-reward">
            <span class="competition-reward-place">2nd</span>
            <strong>50 Cedis</strong>
          </article>
          <article class="competition-reward">
            <span class="competition-reward-place">3rd</span>
            <strong>20 Cedis</strong>
          </article>
        </div>

        <div id="competition-email-form" class="competition-entry">
          <input
            id="competitionEmailInput"
            type="email"
            placeholder="Enter email for the weekly challenge"
            autocomplete="email"
          />
          <button id="competitionOptInBtn">Send Verification Link</button>
        </div>

        <div id="competition-linked-actions" class="competition-linked hidden">
          <p id="competition-linked-email"></p>
          <button id="competitionConfirmBtn">Use Verified Email For Competition</button>
        </div>

        <p class="competition-footnote">
          Open the verification link on this same device to keep your game identity and weekly entry.
        </p>

        <div id="competitionLeaderboard" class="competition-board"></div>
      </section>

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
