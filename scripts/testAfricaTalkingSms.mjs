import process from "node:process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sendAfricasTalkingSms } from "../functions/africasTalkingSms.js";

function getArgValue(flagName) {
  const flagIndex = process.argv.indexOf(flagName);

  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] ?? null;
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
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

async function main() {
  await loadEnvFile();

  const username = process.env.SMS_USERNAME ?? "";
  const apiKey = process.env.SMS_API_KEY ?? "";
  const from = process.env.SMS_SENDER_ID ?? "";
  const to = getArgValue("--to");
  const message =
    getArgValue("--message") ??
    "Adinkra SMS test. If you received this, the production SMS wiring is working.";

  if (!username) {
    throw new Error("Missing SMS_USERNAME in .env or process environment.");
  }

  if (!apiKey) {
    throw new Error("Missing SMS_API_KEY in .env or process environment.");
  }

  if (!to) {
    throw new Error("Pass a recipient with --to.");
  }

  const result = await sendAfricasTalkingSms({
    username,
    apiKey,
    to,
    message,
    from
  });

  console.log(
    JSON.stringify(
      {
        mode: "live",
        to: result.request.to,
        summary: result.summary,
        ok: result.ok,
        recipients: result.recipients
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("SMS test failed:", error.message);

  if (error.payload) {
    console.error(JSON.stringify(error.payload, null, 2));
  }

  process.exitCode = 1;
});
