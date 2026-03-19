import {
  getCompetitionLeaders,
  getCompetitionWeekStatus
} from "../services/competitionService.js";

const REWARD_LABELS = ["100 Cedis", "50 Cedis", "20 Cedis"];

function formatCutoff(weekStatus) {
  return `Closes Saturday at 8:00 AM Ghana time (${weekStatus.weekEndingDate}).`;
}

export async function renderCompetitionLeaderboard() {
  const container = document.getElementById("competitionLeaderboard");

  if (!container) {
    return;
  }

  container.innerHTML = "<p>Loading weekly competition...</p>";

  try {
    const [weekStatus, leaders] = await Promise.all([
      getCompetitionWeekStatus(),
      getCompetitionLeaders()
    ]);

    const statusLabel =
      weekStatus.status === "open"
        ? "Competition is live"
        : "Competition is closed for this week";

    if (leaders.length === 0) {
      container.innerHTML = `
        <div class="competition-board-header">
          <div>
            <p class="competition-board-kicker">${statusLabel}</p>
            <h3>Weekly Reward Leaderboard</h3>
          </div>
          <p class="competition-board-cutoff">${formatCutoff(weekStatus)}</p>
        </div>
        <p class="competition-board-empty">
          No verified competition entries yet. Be the first to claim a spot.
        </p>
      `;
      return;
    }

    const rows = leaders
      .map((entry, index) => {
        const rewardLabel = REWARD_LABELS[index] ?? "Reward";

        return `
          <li class="competition-board-row">
            <span class="competition-board-rank">#${index + 1}</span>
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
    container.innerHTML = `
      <p class="competition-board-empty">
        We could not load the weekly competition leaderboard right now.
      </p>
    `;
  }
}
