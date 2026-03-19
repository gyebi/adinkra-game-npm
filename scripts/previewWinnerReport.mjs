import { buildWinnerEmail } from "../shared/winnerEmail.js";

const winners = [
  {
    email: "winner1@example.com",
    playerName: "Winfred",
    rank: 1,
    attempts: 18,
    completionTimeSeconds: 47
  },
  {
    email: "winner2@example.com",
    playerName: "Akosua",
    rank: 2,
    attempts: 21,
    completionTimeSeconds: 51
  },
  {
    email: "winner3@example.com",
    playerName: "Kwame",
    rank: 3,
    attempts: 24,
    completionTimeSeconds: 59
  }
];

const weekEndingDate = "2026-03-21";

const report = {
  sender: "beitlechemtech@gmail.com",
  weekEndingDate,
  winnerCount: winners.length,
  winners: winners.map((winner) => ({
    to: winner.email,
    rank: winner.rank,
    ...buildWinnerEmail({
      playerName: winner.playerName,
      rank: winner.rank,
      weekEndingDate,
      claimUrl: `https://example.com/claim?week=${weekEndingDate}&rank=${winner.rank}`,
      attempts: winner.attempts,
      completionTimeSeconds: winner.completionTimeSeconds
    })
  }))
};

console.log(JSON.stringify(report, null, 2));
