import process from "node:process";

import { applicationDefault, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const FIREBASE_PROJECT_ID = "adinkra-memory-game";

function formatUtcDateKey(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCompetitionWeekEndingDate(date = new Date()) {
  const weekDate = new Date(date);
  const dayOfWeek = weekDate.getUTCDay();
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

  const currentSaturday = new Date(weekDate);
  currentSaturday.setUTCDate(currentSaturday.getUTCDate() + daysUntilSaturday);
  currentSaturday.setUTCHours(0, 0, 0, 0);

  const currentSaturdayKey = formatUtcDateKey(currentSaturday);
  const currentCutoffAt = new Date(`${currentSaturdayKey}T08:00:00.000Z`);

  if (date.getTime() >= currentCutoffAt.getTime()) {
    daysUntilSaturday += 7;
  }

  weekDate.setUTCDate(weekDate.getUTCDate() + daysUntilSaturday);
  weekDate.setUTCHours(0, 0, 0, 0);

  return formatUtcDateKey(weekDate);
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: FIREBASE_PROJECT_ID
    });
  }

  const db = getFirestore();
  const weekEndingDate = getCompetitionWeekEndingDate(new Date());
  const uid = `ai_test_${weekEndingDate}`;
  const entryId = `${uid}_${weekEndingDate}`;
  const entry = {
    uid,
    playerName: "AI",
    phoneNumber: "+233548762798",
    completionTimeSeconds: 180,
    attempts: 40,
    score: 260,
    weekEndingDate,
    rewardStatus: "pending",
    rewardRank: null,
    rewardAmount: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    finalizedAt: null
  };

  await db.collection("competitionEntries").doc(entryId).set(entry, { merge: true });

  console.log("record saved", {
    collection: "competitionEntries",
    entryId,
    weekEndingDate,
    playerName: entry.playerName,
    phoneNumber: entry.phoneNumber,
    score: entry.score
  });
}

main().catch((error) => {
  console.error("Failed to create competition test entry:", error.message);
  process.exitCode = 1;
});
