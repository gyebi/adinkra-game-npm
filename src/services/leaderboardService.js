import { db } from "../firebase.js";
import { getLeaderboardWeekContext } from "../../shared/leaderboardWeek.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

// Save a score
export async function saveScore({
  userId,
  playerName,
  completionTimeSeconds,
  attempts,
  phoneNumber,
}) {
  if (!userId) {
    console.error("❌ Error saving score: missing userId");
    return { ok: false, reason: "missing_user" };
  }

  if (!phoneNumber) {
    console.error("❌ Error saving score: missing phoneNumber");
    return { ok: false, reason: "missing_phone" };
  }

  try {
    // 📅 Get today's date
    const today = new Date().toISOString().split("T")[0];
    const { weekEndingDate } = getLeaderboardWeekContext(new Date());

    // 🆔 Unique doc ID (one per user per day)
    const docId = `${userId}_${today}`;

    const scoreRef = doc(db, "leaderboard", docId);

    const existingDoc = await getDoc(scoreRef);

    //introducing score
    const score = completionTimeSeconds + attempts * 2;

    // ✅ CASE 1: No existing score → SAVE
    if (!existingDoc.exists()) {
      await setDoc(scoreRef, {
        userId,
        playerName,
        phoneNumber,
        completionTimeSeconds,
        attempts,
        score, // ⭐ NEW FIELD
        date: today,
        weekEndingDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("✅ New score saved");
      return {
        ok: true,
        status: "created",
        entryId: docId
      };
    }

    // ✅ CASE 2: Compare scores
    const oldData = existingDoc.data();

    const newScore = completionTimeSeconds + attempts * 2;

    const oldScore =
      oldData.score ?? oldData.completionTimeSeconds + oldData.attempts * 2;

    const isBetter = newScore < oldScore;

    if (isBetter) {
      await setDoc(
        scoreRef,
        {
          userId,
          playerName,
          phoneNumber,
          completionTimeSeconds,
          attempts,
          score,
          date: today,
          weekEndingDate,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("🔁 Score improved and updated");
      return {
        ok: true,
        status: "improved",
        entryId: docId
      };
    } else {
      console.log("⛔ Score not better — ignored");
      return {
        ok: true,
        status: "unchanged",
        entryId: docId
      };
    }
  } catch (error) {
    console.error("❌ Error saving score:", error);
    return { ok: false, reason: "save_failed" };
  }
}

// Get top scores (fastest time)
export async function getTopScores() {
  try {
    const q = query(
      collection(db, "leaderboard"),
      orderBy("score", "asc"),
      limit(10),
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("❌ Error fetching scores:", error);
    return [];
  }
}
