import { buildWinnerSms } from "../shared/winnerSms.js";

const winners = [
  {
    phoneNumber: "+233201111111",
    playerName: "Winfred",
    rank: 1,
    score: 83,
    attempts: 18,
    completionTimeSeconds: 47
  },
  {
    phoneNumber: "+233202222222",
    playerName: "Akosua",
    rank: 2,
    score: 93,
    attempts: 21,
    completionTimeSeconds: 51
  },
  {
    phoneNumber: "+233203333333",
    playerName: "Kwame",
    rank: 3,
    score: 107,
    attempts: 24,
    completionTimeSeconds: 59
  }
];

const weekEndingDate = "2026-03-21";

const report = {
  channel: "sms",
  weekEndingDate,
  winnerCount: winners.length,
  winners: winners.map((winner) => ({
    phoneNumber: winner.phoneNumber,
    rank: winner.rank,
    ...buildWinnerSms({
      playerName: winner.playerName,
      rank: winner.rank,
      weekEndingDate,
      claimUrl: `https://example.com/claim?week=${weekEndingDate}&rank=${winner.rank}`,
      score: winner.score,
      attempts: winner.attempts,
      completionTimeSeconds: winner.completionTimeSeconds
    })
  }))
};

console.log(JSON.stringify(report, null, 2));
