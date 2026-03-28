import {
  signInAnonymously
} from "firebase/auth";
import { auth } from "./firebase.js";

let currentUserId = null;

export async function initUser() {
  if (auth.currentUser) {
    currentUserId = auth.currentUser.uid;
    return currentUserId;
  }

  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    currentUserId = user.uid;

    console.log("✅ User initialized:", user.uid);

    return currentUserId;
  } catch (error) {
    console.error("❌ Auth error:", error);
    return null;
  }
}

export function getCurrentUserId() {
  return currentUserId ?? auth.currentUser?.uid ?? null;
}
