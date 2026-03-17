import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";

// Save a score
export async function saveScore({
  playerName,
  completionTimeSeconds,
  attempts
}) {
  try {
    await addDoc(collection(db, "leaderboard"), {
      playerName,
      completionTimeSeconds,
      attempts,
      createdAt: serverTimestamp()
    });

    console.log("✅ Score saved");
  } catch (error) {
    console.error("❌ Error saving score:", error);
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
