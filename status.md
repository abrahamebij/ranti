# Ranti — Project Status

Last Updated: 2026-10-29T19:26:00+01:00

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
- [x] **Realtime WebSocket ASR Client (`src/services/metaRealtimeAsr.ts`):** Created native WebSocket streaming client targeting `wss://api.meta.ai/v1/asr/realtime`. Sends JSON handshake frame with Bearer token, receives session acknowledgement, streams binary raw PCM frames, and receives live transcript events until `endStream` half-close.
- [x] **Dev-Only API Check Screen (`src/app/api-check.tsx`):** Updated to test both live Chat Completions and the live WebSocket handshake / PCM stream directly from the device.
- [x] **Base URL & Endpoint Fix:** Base URL set to `https://api.meta.ai/v1` for completions and `wss://api.meta.ai/v1/asr/realtime` for streaming ASR.
- [x] **Typed Error Architecture (`MetaApiError`):** Created structured error handling covering timeouts, 400/401/404/413/429/500 errors and malformed JSON.
- [x] **No Silent Failures:** Eliminated all swallow catches in `metaApi.ts`.
- [x] **Environment Template:** Updated [`.env.example`](file:///c:/Users/Abraham/Desktop/Projects/ranti/.env.example) with official endpoints and spend limit notices.

### B. Listening & Audio Pipeline
- [ ] **Voice Pipeline Reset:** Stripped ambient capture work back to the clean baseline event-listener shell (`src/services/audioRecorder.ts` and `src/hooks/useListeningSession.ts`) so you can implement the audio recording yourself.
- [x] **Pipeline Interface Maintained:** `useListeningSession` retains the clean subscription and start/stop controls hooked up to Firestore and React Query.

### C. Phase 3: Real Onboarding, Assistant Dictation & Identity Decoupling
- [x] **Real Sound Check & Voice Setup (`src/app/voice-setup.tsx`):**
  - Prompts for real Android microphone permissions.
  - Live metering waveform and running timer during recording.
  - Records real audio with `expo-audio`, copies to document directory, and provides immediate audio playback.
  - Collects custom user display name and saves settings via `userSettingsService`.
  - Transparent copy labeled as "Sound check & Profile" (no fake voice-recognition claims).
- [x] **Onboarding Persistence & Auto-Route (`src/app/_layout.tsx`):**
  - Stored `isOnboarded` flag checked on launch; returning users auto-route directly to the main app tabs.
- [x] **Live Assistant Push-to-Dictate (`src/app/(tabs)/assistant.tsx`):**
  - Assistant mic button now initiates native `useAudioStream` capture and streams live PCM chunks to Meta's Realtime ASR WebSocket.
  - Live transcribed speech fills directly into the message input in real-time.
  - Clear visual states: listening, transcribing, error, and red stop button. Independent of background ambient listening.
- [x] **Hardcoded Identity Elimination:**
  - Removed "Alex Lee", "Morning, Alex", and "What does Maya like?".
  - User greeting is dynamic based on time of day and user's saved display name (editable in Settings modal).
  - Suggestions dynamically reference stored memories or fallback to neutral generic questions.

### D. Phase 4: Valid Structured Extraction, Honest Saves & Temporal Grounding
- [x] **Schema-Enforced Extraction (`src/services/extractionSchema.ts` & `src/services/metaApi.ts`):**
  - Integrated Meta's `json_schema` response format with strict validation rules.
  - Constrained categories strictly to `['Plans', 'People', 'Notes', 'General']`.
  - Normalizes and repairs output in code; demotes unresolvable reminders to tasks or notes instead of inventing phantom timestamps.
- [x] **Temporal Grounding & Timezone Injection:**
  - Injects current ISO datetime and the device timezone into the prompt.
  - Instructs model never to invent dates/times when speech is vague.
- [x] **Rolling Context & Deduplication (`src/hooks/useListeningSession.ts`):**
  - Supplies previous transcript chunk and recent memory titles to extraction.
  - Deterministic normalized hash deduplication prevents duplicate writes when speech is repeated across chunks.
  - Saves all entities (`memories`, `tasks`, `reminders`, `events`) and invalidates React Query caches only after real writes.
- [x] **Honest Firestore Storage (`src/services/storage.ts`):**
  - Removed all fake `mem-...` and `task-...` local fallback IDs.
  - Throws typed `StorageError` on failure so errors bubble up honestly.
  - Strips undefined values via `cleanRecord` before write to comply with Firestore rules.
  - Stores consistent ISO timestamps for all `createdAt` fields and sorts chat messages by valid timestamps.
- [x] **Extraction Fixture Diagnostics (`src/services/extractionFixtures.ts`):**
  - Programmatic verification fixture testing explicit datetime resolution vs vague speech handling.

### E. Reminders & Tasks Feature
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
