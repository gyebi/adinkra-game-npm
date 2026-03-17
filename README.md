# Adinkra Memory Game

A Vite-based browser memory game built around Adinkra symbols from Ghana. Players match pairs of symbols, learn each symbol's meaning, and submit their performance to a Firestore-backed leaderboard.

## Features

- Intro screen with short cultural context and game instructions
- Memory-match gameplay using Adinkra symbol cards
- Attempt counter and live timer during play
- Post-game results screen for entering a player name
- Firestore leaderboard showing saved runs by fastest completion time
- Matched-symbol panel showing the name and meaning of each symbol

## Tech Stack

- Vite
- Vanilla JavaScript
- Firebase Web SDK
- Cloud Firestore

## Project Structure

```text
src/
  components/
    Leaderboard.js
  services/
    leaderboardService.js
  styles/
    stylesheet.css
  firebase.js
  game.js
  main.js
```

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Firebase Setup

This project uses Cloud Firestore for leaderboard storage.

The Firebase client configuration lives in `src/firebase.js`.

For leaderboard reads and writes to work:

- Firestore must be enabled for the Firebase project
- Firestore rules must allow public reads and controlled creates for leaderboard entries

Example rules aligned to the current app schema:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{document} {
      allow read: if true;
      allow create: if request.resource.data.playerName is string
                    && request.resource.data.completionTimeSeconds is number
                    && request.resource.data.attempts is number
                    && request.resource.data.keys().hasOnly([
                      'playerName',
                      'completionTimeSeconds',
                      'attempts',
                      'createdAt'
                    ]);
      allow update, delete: if false;
    }
  }
}
```

## Leaderboard Data Shape

Each leaderboard document currently uses:

```js
{
  playerName: string,
  completionTimeSeconds: number,
  attempts: number,
  createdAt: serverTimestamp()
}
```

Leaderboard ordering is currently based on `completionTimeSeconds` ascending.

## Current Game Flow

1. The player starts from the intro screen.
2. The game board appears and the timer starts on the first card flip.
3. Attempts increase each time a pair is checked.
4. When all pairs are matched, the results screen appears.
5. The player enters a name and submits the score.
6. The leaderboard is rendered on the results screen.

## Notes

- The project directory is not currently initialized as a Git repository.
- Score-save success in the UI should ideally be tied to actual Firestore success responses.
- If Firestore rules reject writes, the leaderboard will remain empty.
