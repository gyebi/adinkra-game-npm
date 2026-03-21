import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase.js";

const COMPETITION_COLLECTION = "competitionEntries";
const COMPETITION_WEEKS_COLLECTION = "competitionWeeks";

function formatUtcDateKey(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateCompetitionScore(completionTimeSeconds, attempts) {
  return completionTimeSeconds + attempts * 2;
}

export function getCompetitionWeekContext(date = new Date()) {
  const weekDate = new Date(date);
  const dayOfWeek = weekDate.getUTCDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

  weekDate.setUTCDate(weekDate.getUTCDate() + daysUntilSaturday);
  weekDate.setUTCHours(0, 0, 0, 0);

  const weekEndingDate = formatUtcDateKey(weekDate);
  const cutoffAt = new Date(`${weekEndingDate}T08:00:00.000Z`);

  return {
    weekEndingDate,
    cutoffAt,
    timezone: "Africa/Accra",
    isOpen: date.getTime() < cutoffAt.getTime()
  };
}

export function getCompetitionWeekEndingDate(date = new Date()) {
  return getCompetitionWeekContext(date).weekEndingDate;
}

export function getCompetitionEntryId(uid, weekEndingDate) {
  return `${uid}_${weekEndingDate}`;
}

export async function getCompetitionWeekStatus(date = new Date()) {
  const context = getCompetitionWeekContext(date);
  const weekRef = doc(db, COMPETITION_WEEKS_COLLECTION, context.weekEndingDate);
  const existingWeek = await getDoc(weekRef);

  if (!existingWeek.exists()) {
    return {
      ...context,
      status: context.isOpen ? "open" : "closed",
      finalizedAt: null,
      winnerEntryIds: []
    };
  }

  const data = existingWeek.data();

  return {
    ...context,
    ...data,
    status: data.status ?? (context.isOpen ? "open" : "closed")
  };
}

export async function saveCompetitionEntry({
  userId,
  playerName,
  completionTimeSeconds,
  attempts,
  weekEndingDate = getCompetitionWeekEndingDate()
}) {
  if (!userId) {
    return {
      ok: false,
      reason: "missing_identity"
    };
  }

  const weekStatus = await getCompetitionWeekStatus();

  if (weekStatus.status !== "open") {
    return {
      ok: false,
      reason: "competition_closed"
    };
  }

  const score = calculateCompetitionScore(completionTimeSeconds, attempts);
  const entryId = getCompetitionEntryId(userId, weekEndingDate);
  const entryRef = doc(db, COMPETITION_COLLECTION, entryId);
  const existingEntry = await getDoc(entryRef);

  if (!existingEntry.exists()) {
    await setDoc(entryRef, {
      uid: userId,
      playerName,
      completionTimeSeconds,
      attempts,
      score,
      weekEndingDate,
      rewardStatus: "pending",
      rewardRank: null,
      rewardAmount: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finalizedAt: null
    });

    console.log("🏆 Competition entry created");
    return {
      ok: true,
      status: "created",
      entryId
    };
  }

  const oldData = existingEntry.data();
  const oldScore = oldData.score ?? calculateCompetitionScore(
    oldData.completionTimeSeconds,
    oldData.attempts
  );
  const isBetter =
    score < oldScore ||
    (score === oldScore &&
      completionTimeSeconds < oldData.completionTimeSeconds) ||
    (score === oldScore &&
      completionTimeSeconds === oldData.completionTimeSeconds &&
      attempts < oldData.attempts);

  if (!isBetter) {
    console.log("⛔ Not better for competition");
    return {
      ok: true,
      status: "unchanged",
      entryId
    };
  }

  await setDoc(
    entryRef,
    {
      uid: userId,
      playerName,
      completionTimeSeconds,
      attempts,
      score,
      weekEndingDate,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  console.log("🔁 Competition score improved");
  return {
    ok: true,
    status: "improved",
    entryId
  };
}

export async function getCompetitionLeaders(
  weekEndingDate = getCompetitionWeekEndingDate(),
  maxEntries = 10
) {
  const competitionQuery = query(
    collection(db, COMPETITION_COLLECTION),
    where("weekEndingDate", "==", weekEndingDate),
    orderBy("score", "asc"),
    orderBy("completionTimeSeconds", "asc"),
    orderBy("attempts", "asc"),
    limit(maxEntries)
  );
  const snapshot = await getDocs(competitionQuery);

  return snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data()
  }));
}

export async function getCompetitionLeaderboardData(
  uid,
  weekEndingDate = getCompetitionWeekEndingDate()
) {
  const competitionQuery = query(
    collection(db, COMPETITION_COLLECTION),
    where("weekEndingDate", "==", weekEndingDate),
    orderBy("score", "asc"),
    orderBy("completionTimeSeconds", "asc"),
    orderBy("attempts", "asc")
  );
  const snapshot = await getDocs(competitionQuery);
  const rankedEntries = snapshot.docs.map((entry, index) => ({
    id: entry.id,
    rank: index + 1,
    ...entry.data()
  }));

  return {
    topEntries: rankedEntries.slice(0, 10),
    currentPlayer: uid
      ? rankedEntries.find((entry) => entry.uid === uid) ?? null
      : null
  };
}
