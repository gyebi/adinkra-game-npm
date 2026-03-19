import {
  EmailAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  sendSignInLinkToEmail,
  signInAnonymously
} from "firebase/auth";
import { auth } from "./firebase.js";

const EMAIL_STORAGE_KEY = "competitionEmailForSignIn";

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

export function getCurrentUser() {
  return auth.currentUser;
}

export function getVerifiedEmail() {
  const user = auth.currentUser;
  return user?.emailVerified ? user.email : null;
}

export async function sendCompetitionSignInLink(email) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("competition", "1");

  await sendSignInLinkToEmail(auth, email, {
    url: url.toString(),
    handleCodeInApp: true
  });

  window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
}

export function isCompetitionEmailLink() {
  return isSignInWithEmailLink(auth, window.location.href);
}

export async function completeCompetitionEmailLink() {
  if (!isCompetitionEmailLink()) {
    return null;
  }

  const currentUser = auth.currentUser;
  const email = window.localStorage.getItem(EMAIL_STORAGE_KEY);

  if (!currentUser) {
    throw new Error("No signed-in user found to link this email to.");
  }

  if (!email) {
    throw new Error(
      "This sign-in link must be opened on the same device that requested it."
    );
  }

  const credential = EmailAuthProvider.credentialWithLink(
    email,
    window.location.href
  );
  const result = await linkWithCredential(currentUser, credential);

  currentUserId = result.user.uid;
  window.localStorage.removeItem(EMAIL_STORAGE_KEY);
  window.history.replaceState({}, document.title, window.location.pathname);

  return {
    email: result.user.email,
    uid: result.user.uid
  };
}
