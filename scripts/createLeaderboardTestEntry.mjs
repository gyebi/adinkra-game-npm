import process from "node:process";

import { applicationDefault, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { getLeaderboardWeekContext } from "../shared/leaderboardWeek.js";

const FIREBASE_PROJECT_ID = "adinkra-memory-game";

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: FIREBASE_PROJECT_ID
    });
  }

  const db = getFirestore();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const { weekEndingDate } = getLeaderboardWeekContext(now);
  const userId = `ai_test_${today}`;
  const entryId = `${userId}_${today}`;
  const entry = {
    userId,
    playerName: "AI",
    phoneNumber: "+233548762798",
    completionTimeSeconds: 180,
    attempts: 40,
    score: 260,
    date: today,
    weekEndingDate,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  await db.collection("leaderboard").doc(entryId).set(entry, { merge: true });

  console.log("record saved", {
    collection: "leaderboard",
    entryId,
    weekEndingDate,
    playerName: entry.playerName,
    phoneNumber: entry.phoneNumber,
    score: entry.score
  });
}

main().catch((error) => {
  console.error("Failed to create leaderboard test entry:", error.message);
  process.exitCode = 1;
});
