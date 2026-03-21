import { getTopScores } from "../services/leaderboardService.js";

export async function renderLeaderboard() {
  const container = document.getElementById("leaderboard");

  container.innerHTML = "<p>Loading leaderboard...</p>";

  const scores = await getTopScores();

  if (scores.length === 0) {
    container.innerHTML = "<p>No scores yet</p>";
    return;
  }

  let html = "<h2>🏆 Leaderboard</h2><ol>";

  scores.forEach((score) => {
    html += `
      <li>
        ${score.playerName} - ${score.completionTimeSeconds}s - ${score.attempts} attempts - ${score.score} points
      </li>
    `;
  });

  html += "</ol>";

  container.innerHTML = html;
}
