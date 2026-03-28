import { getTopScores } from "../services/leaderboardService.js";

const RANK_LABELS = ["1st", "2nd", "3rd"];

function formatRankLabel(rank) {
  if (rank <= 3) {
    return RANK_LABELS[rank - 1];
  }

  const mod100 = rank % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th`;
  }

  const mod10 = rank % 10;
  const suffix = mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}

export async function renderLeaderboard({ currentEntryId } = {}) {
  const container = document.getElementById("leaderboard");

  container.innerHTML = "<p>Loading leaderboard...</p>";

  const scores = await getTopScores();

  if (scores.length === 0) {
    container.innerHTML = "<p>No scores yet</p>";
    return {
      scores,
      currentPlayerRank: null,
      currentPlayerInTopTen: false
    };
  }

  let html = "<h2>🏆 Top 10 Leaderboard</h2><ol>";

  scores.forEach((score, index) => {
    const rank = index + 1;
    const rankLabel = formatRankLabel(rank);

    html += `
      <li>
        <strong>${rankLabel}</strong> - ${score.playerName} - ${score.completionTimeSeconds}s - ${score.attempts} attempts - ${score.score} points
      </li>
    `;
  });

  html += "</ol>";

  container.innerHTML = html;

  const currentPlayerIndex = scores.findIndex((score) => score.id === currentEntryId);

  return {
    scores,
    currentPlayerRank: currentPlayerIndex >= 0 ? currentPlayerIndex + 1 : null,
    currentPlayerInTopTen: currentPlayerIndex >= 0
  };
}
