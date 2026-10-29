# Ranti — Project Status

Last Updated: 2026-10-29T18:54:00+01:00

## 1. Project Overview & Target
- **App:** Ranti — AI-powered personal memory assistant for people experiencing memory difficulties.
- **Platform:** Android-first, Expo SDK 57 / React Native 0.86 with Expo Router. Target device: physical Android.
- **Hackathon:** Meta Global AI Developer Hackathon (Deadline: Nov 4, 9:00 PM ET).
- **Core Models:** `muse-voice-transcribe-1.0` (ASR speech transcription), `muse-spark-1.3` (context extraction & conversational memory recall).
- **Data Policy:** 100% Database-Driven via official Firebase JS SDK (`firebase/app` and `firebase/firestore`).
- **UI Policy:** Optimistic UI for instant task completion toggling and task creation.

---

## 2. Completed Architecture & Milestones

### A. Phase 1: Meta Model API Integration & Error Handling
- [x] **Base URL & Endpoint Fix:** Updated base URL to `https://api.meta.ai/v1` and file ASR route to `POST /v1/asr/transcribe` with multipart form upload (`model="muse-voice-transcribe-1.0"`, `file`).
- [x] **Typed Error Architecture (`MetaApiError`):** Created structured error handling covering timeouts, 401/403 bad keys, 429 rate limits, 4xx schema/validation errors, 5xx server failures, and malformed JSON.
- [x] **No Silent Failures:** Eliminated all empty-string/empty-array swallow catches in [`src/services/metaApi.ts`](file:///c:/Users/Abraham/Desktop/Projects/ranti/src/services/metaApi.ts). Errors propagate cleanly to callers.
- [x] **Dev-Only API Check Screen (`src/app/api-check.tsx`):** Added diagnostic screen accessible in Settings (when `__DEV__ === true`) to test live Chat Completions and ASR transcription against Meta's servers with latency, raw status, and full response/error logging.
- [x] **Android File Upload Pipeline:** Integrated `expo-file-system/legacy` with local `file://` cache write, standard multipart fetch, and automatic fallback to `FileSystem.uploadAsync` for native Android compatibility.
- [x] **Environment Template:** Updated [`.env.example`](file:///c:/Users/Abraham/Desktop/Projects/ranti/.env.example) with the official base URL and reminder to set a spend limit on the Meta billing page.

### B. Listening & Audio Pipeline
- [x] **Ambient Recording (`src/hooks/useListeningSession.ts`):** Rolling 30s segments with last partial segment emitted on stop.
- [x] **Silent Chunk Discard:** Rejects silent chunks under threshold to prevent useless model invocation.
- [x] **Permissions:** Requests Android microphone permissions before starting capture session.
- [x] **Pipeline Error Surface:** Exposed `lastError` in the listening session to notify users when transcription or extraction encounters an issue.

### C. Reminders & Tasks Feature
- [x] **Native Date / Time Picker:** Replaced free-text date input with `@react-native-community/datetimepicker` (v9.1.0). Tapping "Set date & time" opens the Android `DatePickerDialog`, then auto-transitions to `TimePickerDialog`. Quick-select preset pills ("Today", "Tomorrow", "Next week") set a `Date` at 9 AM on the respective day and highlight when active. Save stores `time` as a human-readable string (e.g. `Tue, Oct 29 · 5:30 PM`) and `dueAt` as an ISO timestamp in Firestore.
- [x] **Instant Check / Uncheck:** In [`src/hooks/useTasks.ts`](file:///c:/Users/Abraham/Desktop/Projects/ranti/src/hooks/useTasks.ts), checking or unchecking a reminder optimistically toggles the checkbox and line-through immediately with zero latency using React Query `onMutate` cache updates and rollback on error.
- [x] **Instant Task Creation:** When saving a reminder, `addTask` inserts the item optimistically into the cache before awaiting the Firestore network response.

### D. Environment & Security
- [x] **Dotenv Configuration:** Sensitive credentials (`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_META_API_*`) configured strictly via `.env` / `.env.example`.
- [x] **Git Safety:** Updated `.gitignore` to strictly exclude all `.env*` files.

### E. Official Firebase Integration & Services
- [x] **Official Firebase SDK (`src/services/firebase.ts`):** Initialized via `initializeApp` and `getFirestore` from `firebase/app` and `firebase/firestore`.
- [x] **Zero Mock Storage (`src/services/storage.ts`):** Directly queries and writes to Cloud Firestore collections (`users/{userId}/memories`, `tasks`, `reminders`, `events`, `chat`) using modular methods (`getDocs`, `addDoc`, `updateDoc`).
- [x] **Reminder Delivery Engine (`src/services/reminderScheduler.ts`):** Android alert notifications and audio earbud delivery for due reminders.

### F. Screens & UI
- [x] **Assistant Screen (`src/app/(tabs)/assistant.tsx`):** Displays database chat history, interactive input, and active listening toggle with error state.
- [x] **Today Dashboard (`src/app/(tabs)/today.tsx`):** Real-time task checklist, Up Next card, and database memories with clean empty states.
- [x] **Memories Library (`src/app/(tabs)/memories/index.tsx`):** Search and filter pills backed by database query.
- [x] **Memory Detail (`src/app/(tabs)/memories/[id].tsx`):** Renders specific database record with not-found guard.
- [x] **Reminders Screen (`src/app/(tabs)/reminders.tsx`):** Filter tabs, database task checklist, date/time input with quick presets, and interactive reminder creation.
- [x] **Settings Screen (`src/app/(tabs)/settings.tsx`):** Profile card, custom Material-3 switch components, and link to dev API check.
- [x] **Root Layout (`src/app/_layout.tsx`):** QueryClientProvider, vector icon font preloader, safe-area configuration.

---

## 3. Current Data Pipeline

```text
[Device Microphone]
       │
       ▼
[useListeningSession.ts]
       │ (rolling audio segment)
       ▼
[muse-voice-transcribe-1.0] (POST /v1/asr/transcribe)
       │ (turns transcript)
       ▼
[muse-spark-1.3] (POST /v1/chat/completions)
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
