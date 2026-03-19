import {
  getCompetitionLeaderboardData,
  getCompetitionWeekStatus
} from "../services/competitionService.js";

const REWARD_LABELS = ["100 Cedis", "50 Cedis", "20 Cedis"];

function formatCutoff(weekStatus) {
  return `Closes Saturday at 8:00 AM Ghana time (${weekStatus.weekEndingDate}).`;
}

function renderPlayerRank(container, playerStanding) {
  if (!container) {
    return;
  }

  if (!playerStanding || playerStanding.rank <= 10) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = `
    <p class="competition-player-rank-label">Your standing</p>
    <div class="competition-player-rank-row">
      <span class="competition-board-rank">#${playerStanding.rank}</span>
      <div class="competition-board-player">
        <strong>${playerStanding.playerName}</strong>
        <span>${playerStanding.completionTimeSeconds}s • ${playerStanding.attempts} attempts</span>
      </div>
    </div>
  `;
}

export async function renderCompetitionLeaderboard({ currentUserId } = {}) {
  const container = document.getElementById("competitionLeaderboard");
  const playerRankContainer = document.getElementById("competition-player-rank");

  if (!container) {
    return;
  }

  container.innerHTML = "<p>Loading weekly competition...</p>";

  try {
    const [weekStatus, standings] = await Promise.all([
      getCompetitionWeekStatus(),
      getCompetitionLeaderboardData(currentUserId)
    ]);

    const statusLabel =
      weekStatus.status === "open"
        ? "Competition is live"
        : "Competition is closed for this week";

    renderPlayerRank(playerRankContainer, standings.currentPlayer);

    if (standings.topEntries.length === 0) {
      container.innerHTML = `
        <div class="competition-board-header">
          <div>
            <p class="competition-board-kicker">${statusLabel}</p>
            <h3>Weekly Reward Leaderboard</h3>
          </div>
          <p class="competition-board-cutoff">${formatCutoff(weekStatus)}</p>
        </div>
        <p class="competition-board-empty">
          No verified competition entries yet. Be the first verified player on this week's board.
        </p>
      `;
      return;
    }

    const rows = standings.topEntries
      .map((entry, index) => {
        const rewardLabel = REWARD_LABELS[index] ?? "";

        return `
          <li class="competition-board-row">
            <span class="competition-board-rank">#${entry.rank}</span>
            <div class="competition-board-player">
              <strong>${entry.playerName}</strong>
              <span>${entry.completionTimeSeconds}s • ${entry.attempts} attempts</span>
            </div>
            <span class="competition-board-reward">${rewardLabel}</span>
          </li>
        `;
      })
      .join("");

    container.innerHTML = `
      <div class="competition-board-header">
        <div>
          <p class="competition-board-kicker">${statusLabel}</p>
          <h3>Weekly Reward Leaderboard</h3>
        </div>
        <p class="competition-board-cutoff">${formatCutoff(weekStatus)}</p>
      </div>
      <ol class="competition-board-list">
        ${rows}
      </ol>
    `;
  } catch (error) {
    console.error("❌ Could not render competition leaderboard:", error);
    if (playerRankContainer) {
      playerRankContainer.classList.add("hidden");
      playerRankContainer.innerHTML = "";
    }
    container.innerHTML = `
      <p class="competition-board-empty">
        We could not load the weekly competition leaderboard right now.
      </p>
    `;
  }
}
