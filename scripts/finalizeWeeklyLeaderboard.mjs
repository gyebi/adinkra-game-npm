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
    .collection("leaderboard")
    .where("weekEndingDate", "==", weekEndingDate)
    .orderBy("score", "asc")
    .orderBy("completionTimeSeconds", "asc")
    .orderBy("attempts", "asc")
    .get();

  const winners = snapshot.docs.slice(0, 3);
  const weekRef = db.collection("leaderboardWeeks").doc(weekEndingDate);
  const reportRef = db.collection("leaderboardWinnerReports").doc(weekEndingDate);

  await weekRef.set(
    {
      weekEndingDate,
      timezone: "Africa/Accra",
      cutoffAt: `${weekEndingDate}T08:00:00.000Z`,
      status: "closed",
      finalizedAt: FieldValue.serverTimestamp(),
      winnerEntryIds: winners.map((winner) => winner.id)
    },
    { merge: true }
  );

  await reportRef.set(
    {
      weekEndingDate,
      generatedAt: FieldValue.serverTimestamp(),
      channel: "sms",
      entryCount: snapshot.size,
      winnerCount: winners.length,
      winners: winners.map((winnerDoc, index) => {
        const data = winnerDoc.data();
        return {
          rank: index + 1,
          rewardAmount: index === 0 ? 100 : index === 1 ? 50 : 20,
          playerName: data.playerName,
          phoneNumber: data.phoneNumber ?? null,
          score: data.score ?? null,
          completionTimeSeconds: data.completionTimeSeconds,
          attempts: data.attempts,
          documentId: winnerDoc.id
        };
      })
    },
    { merge: true }
  );

  console.log(
    JSON.stringify(
      {
        weekEndingDate,
        entryCount: snapshot.size,
        winners: winners.map((winnerDoc, index) => {
          const data = winnerDoc.data();
          return {
            rank: index + 1,
            rewardAmount: index === 0 ? 100 : index === 1 ? 50 : 20,
            playerName: data.playerName,
            phoneNumber: data.phoneNumber ?? null,
            score: data.score ?? null,
            completionTimeSeconds: data.completionTimeSeconds,
            attempts: data.attempts,
            documentId: winnerDoc.id
          };
        })
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("❌ Could not finalize weekly leaderboard:", error.message);
  process.exitCode = 1;
});
