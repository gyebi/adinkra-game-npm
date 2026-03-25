const rewardLabelByRank = {
  1: "100 Cedis",
  2: "50 Cedis",
  3: "20 Cedis"
};

export const competitionSmsTemplates = {
  entryConfirmation: [
    "Hello {{playerName}},",
    "",
    "Thank you for entering the Adinkra weekly competition.",
    "The current competition closes on {{cutoffDateLabel}} at {{cutoffTimeLabel}} Ghana time.",
    "We'll send you a reminder before the deadline."
  ].join("\n"),
  fridayReminder: [
    "Hello {{playerName}},",
    "",
    "The Adinkra weekly competition closes on {{cutoffDateLabel}} at {{cutoffTimeLabel}} Ghana time.",
    "Complete your run before the deadline to stay in contention."
  ].join("\n"),
  winner: [
    "Hello {{playerName}},",
    "",
    "You finished #{{rank}} on the Adinkra weekly competition leaderboard for the week ending {{weekEndingDate}}.",
    "Prize: {{rewardLabel}}",
    "Winning score: {{score}} points ({{completionTimeSeconds}}s and {{attempts}} attempts).",
    "",
    "To retrieve your prize, use the claim link below and follow the instructions:",
    "{{claimUrl}}"
  ].join("\n")
};

function getCutoffDate(weekEndingDate) {
  return new Date(`${weekEndingDate}T08:00:00.000Z`);
}

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];
    return value == null ? "" : String(value);
  });
}

export function getRewardLabel(rank) {
  return rewardLabelByRank[rank] ?? "Competition Reward";
}

export function formatCompetitionCutoffDateLabel(weekEndingDate) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Accra"
  }).format(getCutoffDate(weekEndingDate));
}

export function formatCompetitionCutoffTimeLabel(weekEndingDate) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Accra"
  }).format(getCutoffDate(weekEndingDate));
}

export function buildEntryConfirmationSms({
  playerName,
  weekEndingDate
}) {
  return {
    text: renderTemplate(competitionSmsTemplates.entryConfirmation, {
      playerName: playerName || "Player",
      cutoffDateLabel: formatCompetitionCutoffDateLabel(weekEndingDate),
      cutoffTimeLabel: formatCompetitionCutoffTimeLabel(weekEndingDate)
    })
  };
}

export function buildCompetitionReminderSms({
  playerName,
  weekEndingDate
}) {
  return {
    text: renderTemplate(competitionSmsTemplates.fridayReminder, {
      playerName: playerName || "Player",
      cutoffDateLabel: formatCompetitionCutoffDateLabel(weekEndingDate),
      cutoffTimeLabel: formatCompetitionCutoffTimeLabel(weekEndingDate)
    })
  };
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
    text: renderTemplate(competitionSmsTemplates.winner, {
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
