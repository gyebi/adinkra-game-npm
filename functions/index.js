import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

import {
  sendAfricasTalkingSms
} from "./africasTalkingSms.js";
import {
  buildCompetitionReminderSms,
  buildEntryConfirmationSms,
  buildWinnerSms,
  getRewardLabel
} from "../shared/competitionSms.js";

initializeApp();

const CLAIM_BASE_URL = defineString("CLAIM_BASE_URL");
const AFRICASTALKING_USERNAME = defineSecret("AFRICASTALKING_USERNAME");
const AFRICASTALKING_API_KEY = defineSecret("AFRICASTALKING_API_KEY");

const db = getFirestore();

function getCurrentAccraWeekContext(referenceDate = new Date()) {
  const utcDay = referenceDate.getUTCDay();
  const isSaturdayAfterCutoff =
    utcDay === 6 &&
    (
      referenceDate.getUTCHours() > 8 ||
      (
        referenceDate.getUTCHours() === 8 &&
        referenceDate.getUTCMinutes() >= 0
      )
    );

  const baseDate = new Date(referenceDate);

  if (!isSaturdayAfterCutoff) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  }

  while (baseDate.getUTCDay() !== 6) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  }

  const year = baseDate.getUTCFullYear();
  const month = `${baseDate.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${baseDate.getUTCDate()}`.padStart(2, "0");
  const weekEndingDate = `${year}-${month}-${day}`;

  return {
    weekEndingDate,
    cutoffAt: `${weekEndingDate}T08:00:00.000Z`
  };
}

function getUpcomingAccraWeekContext(referenceDate = new Date()) {
  const baseDate = new Date(referenceDate);
  const dayOfWeek = baseDate.getUTCDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

  baseDate.setUTCDate(baseDate.getUTCDate() + daysUntilSaturday);

  const year = baseDate.getUTCFullYear();
  const month = `${baseDate.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${baseDate.getUTCDate()}`.padStart(2, "0");
  const weekEndingDate = `${year}-${month}-${day}`;

  return {
    weekEndingDate,
    cutoffAt: `${weekEndingDate}T08:00:00.000Z`
  };
}

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

function buildEntryConfirmationSmsDraft(entryDoc) {
  const entry = entryDoc.data();
  const smsContent = buildEntryConfirmationSms({
    playerName: entry.playerName,
    weekEndingDate: entry.weekEndingDate
  });

  return {
    phoneNumber: entry.phoneNumber ?? null,
    text: smsContent.text,
    entryId: entryDoc.id,
    weekEndingDate: entry.weekEndingDate,
    playerName: entry.playerName
  };
}

function buildReminderSmsDraft(entryDoc, weekEndingDate) {
  const entry = entryDoc.data();
  const smsContent = buildCompetitionReminderSms({
    playerName: entry.playerName,
    weekEndingDate
  });

  return {
    phoneNumber: entry.phoneNumber ?? null,
    text: smsContent.text,
    entryId: entryDoc.id,
    weekEndingDate,
    playerName: entry.playerName
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
    logger.info("Skipping competition SMS that was already sent", {
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

    logger.error("Competition SMS skipped because phone number is missing", {
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

    logger.info("Competition SMS processed", {
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

    logger.error("Competition SMS failed", {
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

export const sendCompetitionEntryConfirmation = onDocumentCreated(
  {
    document: "competitionEntries/{entryId}",
    region: "us-central1",
    secrets: [AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY]
  },
  async (event) => {
    const entrySnapshot = event.data;

    if (!entrySnapshot) {
      return;
    }

    const smsDraft = buildEntryConfirmationSmsDraft(entrySnapshot);
    const deliveryRef = db
      .collection("competitionEntrySmsDeliveries")
      .doc(entrySnapshot.id);

    await sendTrackedSms({
      deliveryRef,
      weekEndingDate: smsDraft.weekEndingDate,
      smsDraft,
      username: AFRICASTALKING_USERNAME.value(),
      apiKey: AFRICASTALKING_API_KEY.value(),
      kind: "entry_confirmation",
      metadata: {
        playerName: smsDraft.playerName
      }
    });
  }
);

export const sendCompetitionReminder = onSchedule(
  {
    schedule: "0 12 * * 5",
    timeZone: "Africa/Accra",
    region: "us-central1",
    secrets: [AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY]
  },
  async () => {
    const { weekEndingDate, cutoffAt } = getUpcomingAccraWeekContext(new Date());
    const entriesSnapshot = await db
      .collection("competitionEntries")
      .where("weekEndingDate", "==", weekEndingDate)
      .orderBy("score", "asc")
      .orderBy("completionTimeSeconds", "asc")
      .orderBy("attempts", "asc")
      .get();

    const reportRef = db.collection("competitionReminderReports").doc(weekEndingDate);
    const smsDrafts = entriesSnapshot.docs.map((entryDoc) =>
      buildReminderSmsDraft(entryDoc, weekEndingDate)
    );

    await reportRef.set(
      {
        weekEndingDate,
        cutoffAt,
        generatedAt: FieldValue.serverTimestamp(),
        channel: "sms",
        entryCount: smsDrafts.length
      },
      { merge: true }
    );

    const username = AFRICASTALKING_USERNAME.value();
    const apiKey = AFRICASTALKING_API_KEY.value();

    const smsResults = await Promise.all(
      smsDrafts.map((smsDraft) =>
        sendTrackedSms({
          deliveryRef: reportRef.collection("smsDeliveries").doc(smsDraft.entryId),
          weekEndingDate,
          smsDraft,
          username,
          apiKey,
          kind: "friday_reminder",
          metadata: {
            playerName: smsDraft.playerName
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

    logger.info("Competition reminder SMS processed", {
      weekEndingDate,
      reminderCount: smsDrafts.length,
      smsResults
    });
  }
);

export const finalizeWeeklyCompetition = onSchedule(
  {
    schedule: "0 8 * * 6",
    timeZone: "Africa/Accra",
    region: "us-central1",
    secrets: [AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY]
  },
  async () => {
    const { weekEndingDate, cutoffAt } = getCurrentAccraWeekContext(new Date());
    const weekRef = db.collection("competitionWeeks").doc(weekEndingDate);
    const weekSnapshot = await weekRef.get();

    if (weekSnapshot.exists && weekSnapshot.data()?.status === "closed") {
      logger.info("Competition week already finalized", { weekEndingDate });
      return;
    }

    const entriesSnapshot = await db
      .collection("competitionEntries")
      .where("weekEndingDate", "==", weekEndingDate)
      .orderBy("score", "asc")
      .orderBy("completionTimeSeconds", "asc")
      .orderBy("attempts", "asc")
      .get();

    const winners = entriesSnapshot.docs.slice(0, 3);
    const batch = db.batch();

    entriesSnapshot.docs.forEach((entryDoc, index) => {
      const isWinner = index < 3;
      const rewardRank = isWinner ? index + 1 : null;
      const rewardAmount = rewardRank === 1 ? 100 : rewardRank === 2 ? 50 : rewardRank === 3 ? 20 : null;

      batch.set(
        entryDoc.ref,
        {
          rewardStatus: isWinner ? "won" : "not_winner",
          rewardRank,
          rewardAmount,
          finalizedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });

    batch.set(
      weekRef,
      {
        weekEndingDate,
        timezone: "Africa/Accra",
        cutoffAt,
        status: "closed",
        finalizedAt: FieldValue.serverTimestamp(),
        winnerEntryIds: winners.map((winner) => winner.id)
      },
      { merge: true }
    );

    await batch.commit();

    const smsDrafts = winners.map((winnerDoc, index) =>
      buildWinnerSmsDraft(winnerDoc, index + 1, weekEndingDate)
    );

    const reportRef = db.collection("competitionWinnerReports").doc(weekEndingDate);

    await reportRef.set(
      {
        weekEndingDate,
        generatedAt: FieldValue.serverTimestamp(),
        channel: "sms",
        winnerCount: winners.length,
        winners: smsDrafts
      },
      { merge: true }
    );

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

    logger.info("Competition week finalized", {
      weekEndingDate,
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
