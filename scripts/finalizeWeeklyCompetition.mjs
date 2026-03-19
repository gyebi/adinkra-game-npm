import { readFile } from "node:fs/promises";
import process from "node:process";

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getArgValue(flagName) {
  const flagIndex = process.argv.indexOf(flagName);

  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] ?? null;
}

async function loadServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    throw new Error(
      "Provide FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH before finalizing weekly winners."
    );
  }

  const fileContents = await readFile(serviceAccountPath, "utf8");
  return JSON.parse(fileContents);
}

function validateWeekEndingDate(weekEndingDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEndingDate)) {
    throw new Error("Pass --week-ending YYYY-MM-DD for the Saturday you want to finalize.");
  }
}

async function main() {
  const weekEndingDate = getArgValue("--week-ending");

  if (!weekEndingDate) {
    throw new Error("Missing required --week-ending argument.");
  }

  validateWeekEndingDate(weekEndingDate);

  const serviceAccount = await loadServiceAccount();

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  const snapshot = await db
    .collection("competitionEntries")
    .where("weekEndingDate", "==", weekEndingDate)
    .orderBy("completionTimeSeconds", "asc")
    .orderBy("attempts", "asc")
    .get();

  const winners = snapshot.docs.slice(0, 3);
  const winnerDocIds = new Set(winners.map((doc) => doc.id));
  const batch = db.batch();

  snapshot.docs.forEach((entryDoc, index) => {
    const isWinner = winnerDocIds.has(entryDoc.id);
    const rewardRank = isWinner ? index + 1 : null;
    const rewardAmount = rewardRank === 1 ? 100 : rewardRank === 2 ? 50 : rewardRank === 3 ? 20 : null;

    batch.set(
      entryDoc.ref,
      {
        rewardStatus: isWinner ? "won" : "not_winner",
        rewardRank,
        rewardAmount,
        finalizedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });

  await batch.commit();

  const summary = winners.map((winnerDoc, index) => {
    const data = winnerDoc.data();
    const rewardAmount = index === 0 ? 100 : index === 1 ? 50 : 20;
    return {
      rank: index + 1,
      rewardAmount,
      playerName: data.playerName,
      email: data.email,
      completionTimeSeconds: data.completionTimeSeconds,
      attempts: data.attempts,
      documentId: winnerDoc.id
    };
  });

  console.log(JSON.stringify({ weekEndingDate, winners: summary }, null, 2));
}

main().catch((error) => {
  console.error("❌ Could not finalize weekly competition:", error.message);
  process.exitCode = 1;
});
