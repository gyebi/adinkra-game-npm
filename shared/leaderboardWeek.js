function formatUtcDateKey(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCutoffDateForSaturday(dateKey) {
  return new Date(`${dateKey}T08:00:00.000Z`);
}

export function getLeaderboardWeekContext(date = new Date()) {
  const weekDate = new Date(date);
  const dayOfWeek = weekDate.getUTCDay();
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

  const currentSaturday = new Date(weekDate);
  currentSaturday.setUTCDate(currentSaturday.getUTCDate() + daysUntilSaturday);
  currentSaturday.setUTCHours(0, 0, 0, 0);

  const currentSaturdayKey = formatUtcDateKey(currentSaturday);
  const currentCutoffAt = getCutoffDateForSaturday(currentSaturdayKey);

  if (date.getTime() >= currentCutoffAt.getTime()) {
    daysUntilSaturday += 7;
  }

  weekDate.setUTCDate(weekDate.getUTCDate() + daysUntilSaturday);
  weekDate.setUTCHours(0, 0, 0, 0);

  const weekEndingDate = formatUtcDateKey(weekDate);
  const cutoffAt = getCutoffDateForSaturday(weekEndingDate);

  return {
    weekEndingDate,
    cutoffAt,
    timezone: "Africa/Accra",
    isOpen: date.getTime() < cutoffAt.getTime()
  };
}

export function getFinalizingLeaderboardWeekContext(date = new Date()) {
  const context = getLeaderboardWeekContext(date);

  if (!context.isOpen) {
    return context;
  }

  const priorWeekDate = new Date(context.cutoffAt);
  priorWeekDate.setUTCDate(priorWeekDate.getUTCDate() - 7);
  return getLeaderboardWeekContext(priorWeekDate);
}
