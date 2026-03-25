import { buildWinnerSms } from "../shared/winnerSms.js";

const preview = buildWinnerSms({
  playerName: "Winfred",
  rank: 1,
  weekEndingDate: "2026-03-21",
  claimUrl: "https://example.com/claim?week=2026-03-21&rank=1",
  score: 83,
  attempts: 18,
  completionTimeSeconds: 47
});

console.log(JSON.stringify(preview, null, 2));
