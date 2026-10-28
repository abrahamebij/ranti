# Ranti — Project Status

Last Updated: 2026-10-28

## 1. Project Overview & Target
- **App:** Ranti — AI-powered personal memory assistant for people experiencing memory difficulties.
- **Platform:** Android-first, Expo SDK 57 / React Native 0.86 with Expo Router.
- **Data Policy:** 100% Database-Driven via official Firebase JS SDK (`firebase/app` and `firebase/firestore`).
- **UI Policy:** Optimistic UI for instant task completion toggling and task creation.

---

## 2. Completed Architecture & Milestones

### A. Optimistic UI Experience
- [x] **Instant Check / Uncheck:** In [`src/hooks/useTasks.ts`](file:///c:/Users/Abraham/Desktop/Projects/ranti/src/hooks/useTasks.ts), checking or unchecking a reminder optimistically toggles the checkbox and line-through immediately with zero latency using React Query `onMutate` cache updates and rollback on error.
- [x] **Instant Task Creation:** When saving a reminder, `addTask` inserts the item optimistically into the cache before awaiting the Firestore network response.

### B. Environment & Security
- [x] **Dotenv Configuration:** Sensitive credentials (`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_META_API_*`) configured strictly via `.env` / `.env.example`.
- [x] **Git Safety:** Updated `.gitignore` to strictly exclude all `.env*` files.

### C. Official Firebase Integration & Services
- [x] **Official Firebase SDK (`src/services/firebase.ts`):** Initialized via `initializeApp` and `getFirestore` from `firebase/app` and `firebase/firestore`.
- [x] **Zero Mock Storage (`src/services/storage.ts`):** Directly queries and writes to Cloud Firestore collections (`users/{userId}/memories`, `tasks`, `reminders`, `events`, `chat`) using modular methods (`getDocs`, `addDoc`, `updateDoc`).
- [x] **Meta AI Gateway (`src/services/metaApi.ts`):** Strict API calls to `muse-voice-transcribe-1.0` (transcription) and `muse-spark-1.3` (context extraction & memory-grounded Q&A recall).
- [x] **Audio Recording Engine (`src/services/audioRecorder.ts`):** Real audio event listener pipeline with no simulated text chunks.
- [x] **Reminder Delivery Engine (`src/services/reminderScheduler.ts`):** Android alert notifications and audio earbud delivery for due reminders.

### D. Screens & UI
- [x] **Assistant Screen (`src/app/(tabs)/assistant.tsx`):** Displays database chat history, interactive input, and active listening toggle.
- [x] **Today Dashboard (`src/app/(tabs)/today.tsx`):** Real-time task checklist, Up Next card, and database memories with clean empty states.
- [x] **Memories Library (`src/app/(tabs)/memories/index.tsx`):** Search and filter pills backed by database query.
- [x] **Memory Detail (`src/app/(tabs)/memories/[id].tsx`):** Renders specific database record with not-found guard.
- [x] **Reminders Screen (`src/app/(tabs)/reminders.tsx`):** Filter tabs, database task checklist, and interactive reminder creation.
- [x] **Settings Screen (`src/app/(tabs)/settings.tsx`):** Profile card, custom Material-3 switch components.
- [x] **Root Layout (`src/app/_layout.tsx`):** QueryClientProvider, vector icon font preloader, safe-area configuration.

---

## 3. Current Data Pipeline

```text
[Device Microphone]
       │
       ▼
[audioRecorder.ts]
       │ (audio segment)
       ▼
[muse-voice-transcribe-1.0]
       │ (transcript)
       ▼
[muse-spark-1.3]
       │ (extracted structured insights)
       ▼
[Official Firestore SDK] ──▶ Cloud Firestore (users/{userId}/...)
       │
       ▼
[React Query Cache Invalidation + Optimistic UI]
       │
       ├───────────────────────────────┐
       ▼                               ▼
[Today & Reminders Dashboard]   [Conversational Recall Chat]
```
