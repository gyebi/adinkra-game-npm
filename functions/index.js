import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { sendAfricasTalkingSms } from "./africasTalkingSms.js";
import { getLeaderboardWeekContext, getFinalizingLeaderboardWeekContext } from "../shared/leaderboardWeek.js";
import { buildWinnerSms, getRewardLabel } from "../shared/winnerSms.js";

initializeApp();

const CLAIM_BASE_URL = defineString("CLAIM_BASE_URL");
const AFRICASTALKING_USERNAME = defineSecret("AFRICASTALKING_USERNAME");
const AFRICASTALKING_API_KEY = defineSecret("AFRICASTALKING_API_KEY");

const db = getFirestore();

function buildClaimUrl(entryId, weekEndingDate, rank) {
  const baseUrl = CLAIM_BASE_URL.value().replace(/\/$/, "");
  const claimUrl = new URL(baseUrl);
  claimUrl.searchParams.set("entry", entryId);
  claimUrl.searchParams.set("week", weekEndingDate);
  claimUrl.searchParams.set("rank", `${rank}`);
  return claimUrl.toString();
}

function buildWinnerSmsDraft(entryDoc, rank, weekEndingDate) {
  const entry = entryDoc.data();
  const smsContent = buildWinnerSms({
    playerName: entry.playerName,
    rank,
    weekEndingDate,
    claimUrl: buildClaimUrl(entryDoc.id, weekEndingDate, rank),
    score: entry.score,
    attempts: entry.attempts,
    completionTimeSeconds: entry.completionTimeSeconds
  });

  return {
    phoneNumber: entry.phoneNumber ?? null,
    text: smsContent.text,
    rank,
    rewardLabel: getRewardLabel(rank),
    entryId: entryDoc.id,
    playerName: entry.playerName,
    score: entry.score,
    completionTimeSeconds: entry.completionTimeSeconds,
    attempts: entry.attempts
  };
}

async function sendTrackedSms({
  deliveryRef,
  weekEndingDate,
  smsDraft,
  username,
  apiKey,
  kind,
  metadata = {}
}) {
  const existingDeliverySnapshot = await deliveryRef.get();
  const existingDelivery = existingDeliverySnapshot.exists
    ? existingDeliverySnapshot.data()
    : null;

  if (existingDelivery?.status === "sent") {
    logger.info("Skipping leaderboard SMS that was already sent", {
      weekEndingDate,
      entryId: smsDraft.entryId,
      phoneNumber: smsDraft.phoneNumber,
      kind
    });

    return {
      entryId: smsDraft.entryId,
      status: "skipped",
      reason: "already_sent"
    };
  }

  if (!smsDraft.phoneNumber) {
    await deliveryRef.set(
      {
        weekEndingDate,
        entryId: smsDraft.entryId,
        kind,
        rank: smsDraft.rank,
        phoneNumber: null,
        message: smsDraft.text,
        status: "failed",
        provider: "africas-talking",
        errorMessage: "Missing winner phone number.",
        metadata,
        lastAttemptAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    logger.error("Leaderboard SMS skipped because phone number is missing", {
      weekEndingDate,
      entryId: smsDraft.entryId,
      kind
    });

    return {
      entryId: smsDraft.entryId,
      status: "failed",
      reason: "missing_phone_number"
    };
  }

  try {
    const response = await sendAfricasTalkingSms({
      username,
      apiKey,
      to: smsDraft.phoneNumber,
      message: smsDraft.text
    });
    const primaryRecipient = response.recipients[0] ?? null;

    await deliveryRef.set(
      {
        weekEndingDate,
        entryId: smsDraft.entryId,
        kind,
        rank: smsDraft.rank,
        phoneNumber: smsDraft.phoneNumber,
        message: smsDraft.text,
        status: response.ok ? "sent" : "failed",
        provider: response.provider,
        providerMessageId: primaryRecipient?.messageId ?? null,
        providerStatus: primaryRecipient?.status ?? null,
        providerStatusCode: primaryRecipient?.statusCode ?? null,
        providerResponse: response.raw ?? null,
        metadata,
        sentAt: response.ok ? FieldValue.serverTimestamp() : null,
        lastAttemptAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    logger.info("Leaderboard SMS processed", {
      weekEndingDate,
      entryId: smsDraft.entryId,
      phoneNumber: smsDraft.phoneNumber,
      kind,
      status: response.ok ? "sent" : "failed",
      providerStatus: primaryRecipient?.status ?? null
    });

    return {
      entryId: smsDraft.entryId,
      status: response.ok ? "sent" : "failed",
      providerStatus: primaryRecipient?.status ?? null
    };
  } catch (error) {
    await deliveryRef.set(
      {
        weekEndingDate,
        entryId: smsDraft.entryId,
        kind,
        rank: smsDraft.rank,
        phoneNumber: smsDraft.phoneNumber,
        message: smsDraft.text,
        status: "failed",
        provider: "africas-talking",
        errorMessage: error.message,
        providerResponse: error.payload ?? null,
        httpStatus: error.status ?? null,
        metadata,
        lastAttemptAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    logger.error("Leaderboard SMS failed", {
      weekEndingDate,
      entryId: smsDraft.entryId,
      phoneNumber: smsDraft.phoneNumber,
      kind,
      errorMessage: error.message,
      httpStatus: error.status ?? null
    });

    return {
      entryId: smsDraft.entryId,
      status: "failed",
      reason: "provider_error"
    };
  }
}

async function getWeeklyLeaderboardSnapshot(weekEndingDate) {
  return db
    .collection("leaderboard")
    .where("weekEndingDate", "==", weekEndingDate)
    .orderBy("score", "asc")
    .orderBy("completionTimeSeconds", "asc")
    .orderBy("attempts", "asc")
    .get();
}

export const finalizeWeeklyLeaderboard = onSchedule(
  {
    schedule: "0 8 * * 6",
    timeZone: "Africa/Accra",
    region: "us-central1",
    secrets: [AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY]
  },
  async () => {
    const { weekEndingDate } = getFinalizingLeaderboardWeekContext(new Date());
    const { cutoffAt, timezone } = getLeaderboardWeekContext(new Date(`${weekEndingDate}T07:59:59.000Z`));
    const weekRef = db.collection("leaderboardWeeks").doc(weekEndingDate);
    const weekSnapshot = await weekRef.get();

    if (weekSnapshot.exists && weekSnapshot.data()?.status === "closed") {
      logger.info("Leaderboard week already finalized", { weekEndingDate });
      return;
    }

    const entriesSnapshot = await getWeeklyLeaderboardSnapshot(weekEndingDate);
    const winners = entriesSnapshot.docs.slice(0, 3);
    const reportRef = db.collection("leaderboardWinnerReports").doc(weekEndingDate);

    await weekRef.set(
      {
        weekEndingDate,
        timezone,
        cutoffAt: cutoffAt.toISOString(),
        status: "closed",
        finalizedAt: FieldValue.serverTimestamp(),
        winnerEntryIds: winners.map((winner) => winner.id)
      },
      { merge: true }
    );

    const smsDrafts = winners.map((winnerDoc, index) =>
      buildWinnerSmsDraft(winnerDoc, index + 1, weekEndingDate)
    );

    await reportRef.set(
      {
        weekEndingDate,
        generatedAt: FieldValue.serverTimestamp(),
        channel: "sms",
        entryCount: entriesSnapshot.size,
        winnerCount: winners.length,
        winners: smsDrafts
      },
      { merge: true }
    );

    if (smsDrafts.length === 0) {
      logger.info("Leaderboard week finalized with no winners", {
        weekEndingDate,
        entryCount: entriesSnapshot.size
      });
      return;
    }

    const africasTalkingUsername = AFRICASTALKING_USERNAME.value();
    const africasTalkingApiKey = AFRICASTALKING_API_KEY.value();

    const smsResults = await Promise.all(
      smsDrafts.map((smsDraft) =>
        sendTrackedSms({
          deliveryRef: reportRef.collection("smsDeliveries").doc(smsDraft.entryId),
          weekEndingDate,
          smsDraft,
          username: africasTalkingUsername,
          apiKey: africasTalkingApiKey,
          kind: "winner_notification",
          metadata: {
            playerName: smsDraft.playerName,
            rewardLabel: smsDraft.rewardLabel
          }
        })
      )
    );

    await reportRef.set(
      {
        smsDelivery: {
          provider: "africas-talking",
          mode: "live",
          attemptedAt: FieldValue.serverTimestamp(),
          results: smsResults
        }
      },
      { merge: true }
    );

    logger.info("Leaderboard week finalized", {
      weekEndingDate,
      entryCount: entriesSnapshot.size,
      smsMode: "live",
      smsResults,
      winners: winners.map((winner, index) => ({
        entryId: winner.id,
        rank: index + 1,
        phoneNumber: winner.data().phoneNumber ?? null
      }))
    });
  }
);
