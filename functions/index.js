import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineString } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { buildWinnerEmail, getRewardLabel } from "../shared/winnerEmail.js";

initializeApp();

const CLAIM_BASE_URL = defineString("CLAIM_BASE_URL");

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

function buildClaimUrl(entryId, weekEndingDate, rank) {
  const baseUrl = CLAIM_BASE_URL.value().replace(/\/$/, "");
  const claimUrl = new URL(baseUrl);
  claimUrl.searchParams.set("entry", entryId);
  claimUrl.searchParams.set("week", weekEndingDate);
  claimUrl.searchParams.set("rank", `${rank}`);
  return claimUrl.toString();
}

function buildWinnerEmailDraft(entryDoc, rank, weekEndingDate) {
  const entry = entryDoc.data();
  const emailContent = buildWinnerEmail({
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
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
    rank,
    rewardLabel: getRewardLabel(rank),
    entryId: entryDoc.id,
    playerName: entry.playerName,
    score: entry.score,
    completionTimeSeconds: entry.completionTimeSeconds,
    attempts: entry.attempts,
    sender: "beitlechemtech@gmail.com"
  };
}

export const finalizeWeeklyCompetition = onSchedule(
  {
    schedule: "0 8 * * 6",
    timeZone: "Africa/Accra",
    region: "us-central1"
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

    const emailDrafts = winners.map((winnerDoc, index) =>
      buildWinnerEmailDraft(winnerDoc, index + 1, weekEndingDate)
    );

    await db.collection("competitionWinnerReports").doc(weekEndingDate).set(
      {
        weekEndingDate,
        generatedAt: FieldValue.serverTimestamp(),
        sender: "beitlechemtech@gmail.com",
        winnerCount: winners.length,
        winners: emailDrafts
      },
      { merge: true }
    );

    logger.info("Competition week finalized", {
      weekEndingDate,
      winners: winners.map((winner, index) => ({
        entryId: winner.id,
        rank: index + 1,
        phoneNumber: winner.data().phoneNumber ?? null
      }))
    });
  }
);
