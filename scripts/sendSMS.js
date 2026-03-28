import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { applicationDefault, cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { sendAfricasTalkingSms } from "../functions/africasTalkingSms.js";

const FIREBASE_PROJECT_ID = "adinkra-memory-game";

function getArgValue(flagName) {
  const flagIndex = process.argv.indexOf(flagName);

  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] ?? null;
}

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

async function loadEnvFile() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, "../.env");
  const raw = await readFile(envPath, "utf8");

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

async function loadServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    throw new Error(
      "Provide FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to read captured player phone numbers."
    );
  }

  const fileContents = await readFile(serviceAccountPath, "utf8");
  return JSON.parse(fileContents);
}

async function getDb() {
  if (getApps().length === 0) {
    try {
      const serviceAccount = await loadServiceAccount();

      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id ?? FIREBASE_PROJECT_ID
      });
    } catch (error) {
      if (
        /FIREBASE_SERVICE_ACCOUNT_JSON|FIREBASE_SERVICE_ACCOUNT_PATH/.test(
          error.message
        )
      ) {
        initializeApp({
          credential: applicationDefault(),
          projectId: FIREBASE_PROJECT_ID
        });
      } else {
        throw error;
      }
    }
  }

  return getFirestore();
}

function normalizeWeekEndingDate(value) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Pass --week-ending YYYY-MM-DD.");
  }

  return value;
}

function formatEntry(entryDoc) {
  const data = entryDoc.data();

  return {
    id: entryDoc.id,
    userId: data.userId ?? null,
    playerName: data.playerName ?? null,
    phoneNumber: data.phoneNumber ?? null,
    weekEndingDate: data.weekEndingDate ?? null,
    score: data.score ?? null,
    completionTimeSeconds: data.completionTimeSeconds ?? null,
    attempts: data.attempts ?? null
  };
}

async function getLeaderboardEntries(weekEndingDate) {
  const db = await getDb();
  let query = db.collection("leaderboard");

  if (weekEndingDate) {
    query = query.where("weekEndingDate", "==", weekEndingDate);
  }

  const snapshot = await query
    .orderBy("weekEndingDate", "desc")
    .orderBy("score", "asc")
    .orderBy("completionTimeSeconds", "asc")
    .orderBy("attempts", "asc")
    .get();

  return snapshot.docs.map(formatEntry);
}

function printEntries(entries) {
  if (entries.length === 0) {
    console.log("No leaderboard phone numbers found.");
    return;
  }

  console.log(JSON.stringify({
    count: entries.length,
    phoneNumbers: entries.map((entry) => ({
      playerName: entry.playerName,
      phoneNumber: entry.phoneNumber,
      weekEndingDate: entry.weekEndingDate,
      score: entry.score
    }))
  }, null, 2));
}

async function sendMessage(entries, message) {
  const username = process.env.SMS_USERNAME ?? "";
  const apiKey = process.env.SMS_API_KEY ?? "";
  const from = process.env.SMS_SENDER_ID ?? "";

  if (!username) {
    throw new Error("Missing SMS_USERNAME in .env or process environment.");
  }

  if (!apiKey) {
    throw new Error("Missing SMS_API_KEY in .env or process environment.");
  }

  const recipients = entries
    .map((entry) => entry.phoneNumber)
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error("No valid recipient phone numbers were found.");
  }

  const result = await sendAfricasTalkingSms({
    username,
    apiKey,
    to: recipients,
    message,
    from
  });

  console.log(JSON.stringify({
    mode: "live",
    summary: result.summary,
    ok: result.ok,
    recipients: result.recipients
  }, null, 2));
}

async function main() {
  await loadEnvFile();

  const weekEndingDate = normalizeWeekEndingDate(getArgValue("--week-ending"));
  const shouldSend = hasFlag("--send");
  const message = getArgValue("--message");
  const entries = await getLeaderboardEntries(weekEndingDate);

  printEntries(entries);

  if (!shouldSend) {
    console.log("Dry run only. Pass --send and --message \"...\" to actually send SMS.");
    return;
  }

  if (!message) {
    throw new Error("Pass --message when using --send.");
  }

  await sendMessage(entries, message);
}

main().catch((error) => {
  console.error("SMS admin script failed:", error.message);
  process.exitCode = 1;
});
