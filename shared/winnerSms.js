const rewardLabelByRank = {
  1: "100 Cedis",
  2: "50 Cedis",
  3: "20 Cedis"
};

const winnerTemplate = [
  "Hello {{playerName}},",
  "",
  "You finished #{{rank}} on the Adinkra leaderboard for the week ending {{weekEndingDate}}.",
  "Prize: {{rewardLabel}}",
  "Winning score: {{score}} points ({{completionTimeSeconds}}s and {{attempts}} attempts).",
  "",
  "To retrieve your prize, use the claim link below and follow the instructions:",
  "{{claimUrl}}"
].join("\n");

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];
    return value == null ? "" : String(value);
  });
}

export function getRewardLabel(rank) {
  return rewardLabelByRank[rank] ?? "Leaderboard Reward";
}

export function buildWinnerSms({
  playerName,
  rank,
  weekEndingDate,
  claimUrl,
  score,
  attempts,
  completionTimeSeconds
}) {
  return {
    text: renderTemplate(winnerTemplate, {
      playerName: playerName || "Player",
      rank,
      weekEndingDate,
      rewardLabel: getRewardLabel(rank),
      score,
      attempts,
      completionTimeSeconds,
      claimUrl
    })
  };
}
