import { buildWinnerEmail } from "../shared/winnerEmail.js";

const preview = buildWinnerEmail({
  playerName: "Winfred",
  rank: 1,
  weekEndingDate: "2026-03-21",
  claimUrl: "https://example.com/claim?week=2026-03-21&rank=1",
  attempts: 18,
  completionTimeSeconds: 47
});

console.log(JSON.stringify(preview, null, 2));
