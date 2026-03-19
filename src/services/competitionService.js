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
const PENDING_ENTRY_KEY = "pendingCompetitionEntry";
const COMPETITION_FLASH_KEY = "competitionFlashMessage";

function formatUtcDateKey(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function stashPendingCompetitionEntry(entry) {
  window.localStorage.setItem(PENDING_ENTRY_KEY, JSON.stringify(entry));
}

export function readPendingCompetitionEntry() {
  const rawValue = window.localStorage.getItem(PENDING_ENTRY_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.error("❌ Could not parse pending competition entry:", error);
    window.localStorage.removeItem(PENDING_ENTRY_KEY);
    return null;
  }
}

export function clearPendingCompetitionEntry() {
  window.localStorage.removeItem(PENDING_ENTRY_KEY);
}

export function setCompetitionFlashMessage(message) {
  window.localStorage.setItem(COMPETITION_FLASH_KEY, message);
}

export function consumeCompetitionFlashMessage() {
  const message = window.localStorage.getItem(COMPETITION_FLASH_KEY);

  if (message) {
    window.localStorage.removeItem(COMPETITION_FLASH_KEY);
  }

  return message;
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
  uid,
  playerName,
  email,
  completionTimeSeconds,
  attempts,
  weekEndingDate = getCompetitionWeekEndingDate()
}) {
  if (!uid || !email) {
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

  const entryId = getCompetitionEntryId(uid, weekEndingDate);
  const entryRef = doc(db, COMPETITION_COLLECTION, entryId);
  const existingEntry = await getDoc(entryRef);

  if (!existingEntry.exists()) {
    await setDoc(entryRef, {
      uid,
      playerName,
      email,
      emailVerified: true,
      completionTimeSeconds,
      attempts,
      weekEndingDate,
      rewardStatus: "pending",
      rewardRank: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      ok: true,
      status: "created",
      entryId
    };
  }

  const currentBest = existingEntry.data();
  const improved =
    completionTimeSeconds < currentBest.completionTimeSeconds ||
    (completionTimeSeconds === currentBest.completionTimeSeconds &&
      attempts < currentBest.attempts);

  if (!improved) {
    return {
      ok: true,
      status: "unchanged",
      entryId
    };
  }

  await setDoc(
    entryRef,
    {
      uid,
      playerName,
      email,
      emailVerified: true,
      completionTimeSeconds,
      attempts,
      weekEndingDate,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return {
    ok: true,
    status: "improved",
    entryId
  };
}

export async function getCompetitionLeaders(
  weekEndingDate = getCompetitionWeekEndingDate()
) {
  const competitionQuery = query(
    collection(db, COMPETITION_COLLECTION),
    where("weekEndingDate", "==", weekEndingDate),
    orderBy("completionTimeSeconds", "asc"),
    orderBy("attempts", "asc"),
    limit(3)
  );
  const snapshot = await getDocs(competitionQuery);

  return snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data()
  }));
}
