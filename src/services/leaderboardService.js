import { db } from "../firebase.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";

// Save a score
export async function saveScore({
  userId,
  playerName,
  completionTimeSeconds,
  attempts
}) {
  if (!userId) {
    console.error("❌ Error saving score: missing userId");
    return false;
  }

  try {
    // 📅 Get today's date
    const today = new Date().toISOString().split("T")[0];

    // 🆔 Unique doc ID (one per user per day)
    const docId = `${userId}_${today}`;

    const scoreRef = doc(db, "leaderboard", docId);

    const existingDoc = await getDoc(scoreRef);

    // ✅ CASE 1: No existing score → SAVE
    if (!existingDoc.exists()) {
      await setDoc(scoreRef, {
        userId,
        playerName,
        completionTimeSeconds,
        attempts,
        date: today,
        createdAt: serverTimestamp()
      });

      console.log("✅ New score saved");
      return true;
    }
  
  // ✅ CASE 2: Compare scores
    const oldData = existingDoc.data();

    const isBetter =
      completionTimeSeconds < oldData.completionTimeSeconds ||
      (completionTimeSeconds === oldData.completionTimeSeconds &&
        attempts < oldData.attempts);

    if (isBetter) {
      await setDoc(scoreRef, {
        userId,
        playerName,
        completionTimeSeconds,
        attempts,
        date: today,
        createdAt: serverTimestamp()
      });

      console.log("🔁 Score improved and updated");
      return true;
    } else {
      console.log("⛔ Score not better — ignored");
      return true;
    }
  } catch (error) {
    console.error("❌ Error saving score:", error);
    return false;
  }
}

// Get top scores (fastest time)
export async function getTopScores() {
  try {
    const q = query(
      collection(db, "leaderboard"),
      orderBy("completionTimeSeconds", "asc"),
      limit(10)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error("❌ Error fetching scores:", error);
    return [];
  }
}
