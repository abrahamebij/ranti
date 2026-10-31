<a id="top"></a>

<h1 align="center">Ranti</h1>

<p align="center">
  <strong>A little more to remember.</strong><br>
  Voice-first memory prosthetic built specifically for individuals living with Alzheimer&apos;s disease, dementia, and cognitive impairment. Powered by Meta Llama on Android.
</p>

<p align="center">
  <a href="#x-running-it">Run locally</a>
  &nbsp; · &nbsp;
  <a href="#iii-the-shape">Architecture</a>
  &nbsp; · &nbsp;
  <a href="#xi-what-is-true-and-what-is-not">What works today</a>
  &nbsp; · &nbsp;
  <a href="#viii-the-decisions">Engineering decisions</a>
</p>

<p align="center">
  <sub>ANDROID &nbsp; / &nbsp; EXPO SDK 57 &nbsp; / &nbsp; REACT NATIVE 0.86 &nbsp; / &nbsp; META LLAMA &nbsp; / &nbsp; CLOUD FIRESTORE</sub>
</p>

---

Memory capture is **one continuous loop**: listen to spoken thoughts, stream chunks to Meta's Cloud API, enforce strict structured schemas, and persist memories, tasks, reminders, and events into Cloud Firestore with temporal grounding.

Recall answers questions with **verified attribution**: every fact cites a stable ID from the user's real records, or plainly admits it has no record.

| Pipeline step | Target | Measured behavior | Boundary |
| :--- | :---: | :---: | :--- |
| **Microphone metering** | 120ms polling | Live RMS energy waveform during sound check | Local audio session only |
| **Dictation recording** | 16kHz mono M4A | Fast tap-to-talk transcription into Assistant input | Active modal dictation |
| **Speech-to-text** | Meta ASR API | Speech chunk transcribed into timestamped text | HTTPS cloud round-trip |
| **Structured extraction** | Meta Llama 3.3 | Memories, tasks, reminders & events in JSON schema | Strict schema enforcement |
| **Firestore write** | Cloud Firestore | Atomic document creation with real generated IDs | Zero fake-ID fallbacks |
| **Contextual recall** | Meta Llama RAG | Cross-entity retrieval with verified source chips | Strict anti-hallucination refusal |

<p align="center"><sub>Recorded October 2026 · physical Android device & Expo Go · Meta Model API.<br>Every control verified — zero placeholder handlers. Full evidence in <a href="#xi-what-is-true-and-what-is-not">What works today</a>.</sub></p>

> **The record is the truth.**
>
> For individuals living with Alzheimer&apos;s disease, dementia, or age-related memory impairment, everyday memory gaps create anxiety, confusion, and loss of independence.
> Traditional note apps fail because they require the very executive function that cognitive decline impairs.
> Ranti listens when permitted, extracts structured facts without manual typing, and answers only from verified records.

| What has been observed on device | Where the boundary is |
| :--- | :--- |
| Real microphone recording, live metering waveform, and audio playback | Voice setup verifies input levels; does not run biometric speaker identification. |
| Schema-enforced extraction separating memories, tasks, reminders, and calendar events | Audio is processed via Meta Cloud APIs, not on-device. |
| Temporal resolution resolving "tomorrow at 3pm" to concrete ISO timestamps | Resolves relative times from injected device timezone; never fabricates a missing hour. |
| Assistant answering from real database items with tappable source chips | Answers are strictly grounded in retrieved records; asks for clarification when missing. |
| Foreground spoken reminders reading titles aloud via `expo-speech` | Spoken reminders run while app is open; native notifications require a dev build. |
| Complete data wipe erasing all Firestore user collections and local files | Deletion permanently wipes cloud documents and device storage; irreversible. |

<details>
<summary><strong>Contents — the product, the engineering, the evidence</strong></summary>

| | Chapter | |
| :--- | :--- | :--- |
| 01 | [The gap](#i-the-problem) | Why digital notes get abandoned |
| 02 | [The promise](#ii-the-one-idea) | Ambient capture, structured extraction, verified recall |
| 03 | [Architecture](#iii-the-shape) | Mobile frontend, Meta inference, Cloud Firestore |
| 04 | [The life of a memory](#iv-the-life-of-a-memory) | Record, transcribe, ground, extract, save |
| 05 | [Grounding & recall](#v-grounding-and-recall) | Cross-entity context and tappable source chips |
| 06 | [Reminders & spoken delivery](#vi-reminders-and-delivery) | In-memory timers and foreground speech |
| 07 | [Privacy & data sovereignty](#vii-privacy) | Cloud processing disclosure and real deletion |
| 08 | [Engineering decisions](#viii-the-decisions) | Eight architectural choices and lessons |
| 09 | [Repository map](#ix-the-map) | Where the moving parts live |
| 10 | [Run locally](#x-running-it) | Install, configure, test in Expo Go |
| 11 | [What works today](#xi-what-is-true-and-what-is-not) | Observed, unobserved, absent |

</details>

---

<a id="i-the-problem"></a>

## 01 · The gap

You leave your glasses on the nightstand. You promise your daughter you will take your medicine at four. Someone mentions a neighbor&apos;s name, and two minutes later it has slipped away entirely.

For millions of individuals and families, this is not a casual inconvenience. It is the disorienting, daily reality of progressive cognitive decline and memory impairment.

> **The global reality of memory loss**
>
> According to the **World Health Organization (WHO)**, more than **55 million people** worldwide are currently living with dementia, with Alzheimer&apos;s disease contributing to 60–70% of cases.
>
> **Nearly 10 million new cases are diagnosed every year** — equivalent to one new person developing dementia **every 3.2 seconds**.
> The total number of people living with dementia is projected to surge to **78 million by 2030** and **139 million by 2050**, driven by an aging global population ([WHO Dementia Fact Sheet, 2023](https://www.who.int/news-room/fact-sheets/detail/dementia)).

### Why conventional digital tools fail

Traditional productivity apps and digital notebooks are built for tech-savvy knowledge workers, not for individuals coping with memory loss or cognitive fatigue:

- **Complex interaction trees**: Navigating nested screens, date pickers, dropdowns, and tags requires executive function that cognitive decline steadily impairs.
- **Manual transcription burden**: When remembering to write something down is the very thing that fails, an app that demands manual input is useless.
- **Cognitive friction and anxiety**: Forgetting familiar names, appointments, or promises causes acute social anxiety and erodes personal independence.

**Ranti** (Yoruba for *"Remember"*) is designed from the ground up as a gentle, ambient prosthetic for human memory:

1. **Zero-friction voice capture**: Speak naturally via push-to-talk dictation or ambient listening sessions without typing or screen navigation.
2. **Autonomous structured extraction**: Meta Llama listens and categorizes items automatically into memories, tasks, reminders, and calendar events with temporal grounding.
3. **Reassuring, grounded recall**: When the user or a caregiver asks *"Where are my keys?"* or *"Who is visiting today?"*, Ranti answers calmly and truthfully, attributing every fact directly to a verified record.

---

<a id="ii-the-one-idea"></a>

## 02 · The promise

> **Capture naturally. Extract structured facts. Protect against confusion.**

For someone living with memory impairment, receiving a fabricated or hallucinated answer from an AI assistant is far worse than receiving no answer: it creates confusion, agitation, and false beliefs.

When you speak to Ranti, you never organize folders, configure tags, or manually sort items. The pipeline guarantees three foundational invariants:

- **Strict schema boundaries.** Freeform prose extraction is banned. Meta Llama returns schema-enforced JSON conforming to strict types. Memories belong strictly to UI-supported categories (`People`, `Plans`, `Notes`, `General`); tasks have booleans; reminders have resolvable deadlines.
- **Temporal grounding without invention.** Relative phrases like *"take morning medicine tomorrow"* are anchored to the device&apos;s actual ISO datetime and timezone. If the speaker did not mention a specific time, Ranti does not invent one — it saves a task or note rather than hallucinating an alarm.
- **Attribution or silence (Anti-confabulation).** When asked *"Where did I put my keys?"*, the Assistant checks real user memories. If found, it answers and provides a verified, tappable source chip. If absent, it states plainly: *"I don&apos;t have a record of that."* It never fabricates answers to appease the user.

---

<a id="iii-the-shape"></a>

## 03 · Architecture

A mobile-first architecture built for low latency on Android.

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Mobile App** | Expo SDK 57 · React Native 0.86 · Expo Router | Native UI, file routing, audio recording, permissions |
| **Inference Layer** | Meta Model API (`meta/whisper` & `llama-3.3-70b-instruct`) | Speech-to-text, structured extraction, grounded RAG recall |
| **State & Cache** | TanStack React Query v5 | Optimistic UI updates, cache invalidation, query synchronization |
| **Persistence** | Cloud Firestore | Realtime document storage (`memories`, `tasks`, `reminders`, `events`, `chat`) |
| **Local Storage** | `expo-file-system` | Sound check samples, user settings, onboarded state |

```mermaid
flowchart TB
    subgraph client["Android Client · Expo SDK 57"]
        mic["expo-audio<br/>Live recorder & metering"]
        ui["Expo Router Screens<br/>Today · Memories · Assistant · Reminders · Settings"]
        rq["TanStack React Query<br/>Optimistic cache & mutations"]
        fs["expo-file-system<br/>Settings & audio clips"]
        speech["expo-speech<br/>Foreground spoken delivery"]
    end

    subgraph cloud["Cloud Services"]
        meta_asr["Meta Speech ASR API<br/>Audio chunk to text"]
        meta_llama["Meta Llama 3.3 API<br/>Structured JSON extraction & Grounded RAG"]
        firestore["Cloud Firestore<br/>Users, memories, tasks, reminders, chat"]
    end

    mic --> meta_asr
    meta_asr --> meta_llama
    meta_llama --> rq
    rq --> firestore
    firestore --> ui
    ui --> speech
    ui --> fs

    classDef clientStyle fill:#0B0D12,stroke:#166e3d,color:#ffffff
    classDef engineStyle fill:#EEF2FF,stroke:#166e3d,color:#0B0D12
    classDef cloudStyle fill:#F7F8FA,stroke:#D3D6CD,color:#1A1A1A
    class mic,ui,rq,fs,speech clientStyle
    class meta_asr,meta_llama engineStyle
    class firestore cloudStyle
```

---

<a id="iv-the-life-of-a-memory"></a>

## 04 · The life of a memory

From spoken phrase to persisted database record with zero data loss.

```mermaid
sequenceDiagram
    autonumber
    participant User as User Speech
    participant Rec as audioRecorder
    participant MetaASR as Meta ASR API
    participant Extractor as metaExtractor (Llama 3.3)
    participant Storage as Cloud Firestore
    participant UI as TanStack Cache / UI

    User->>Rec: "Pick up dry cleaning tomorrow at 4pm"
    Rec->>MetaASR: Stream audio chunk (HTTPS)
    MetaASR-->>Extractor: Transcript text
    Note over Extractor: Injects current ISO timestamp + device timezone + rolling context
    Extractor->>Extractor: Enforce JSON schema (Deduplicate & anchor relative time)
    Extractor->>Storage: addReminder({ title, scheduledAt: "2026-11-01T16:00:00" })
    Storage-->>UI: Real Firestore Document ID
    UI-->>User: Reminders tab updates optimistically
```

### 1 · Rolling context deduplication

Extracting audio in chunks risks saving the same memory multiple times if a thought spans a chunk boundary. `metaExtractor` maintains a rolling context window:

- The previous transcript snippet.
- The titles of recently extracted memories.
- A deterministic similarity check on normalized content before writing to Firestore.

### 2 · Honest error handling

`storage.ts` contains **zero fake fallback IDs**. When an item fails validation or a network connection drops:

- Undefined fields are stripped before Firestore rejection.
- Default fields (`completed: false`, `createdAt: ISOString`) are guaranteed.
- If a write fails, typed `StorageError` exceptions propagate directly to the UI, presenting an actionable retry prompt.

---

<a id="v-grounding-and-recall"></a>

## 05 · Grounding & recall

The Assistant does not chat loosely. It answers from your real life.

```text
User: "Where did I leave my passport?"
Assistant: "You put your passport in the blue folder inside the desk drawer."
[Chip: From "Passport location" ↗]
```

| Component | Implementation | Invariant |
| :--- | :--- | :--- |
| **Context Assembly** | Keyword scoring + recency ranking across memories, tasks, reminders, and events | Context window capped; never dumps entire database |
| **Entity Identification** | Every supplied item receives a stable ID | Identifiers match real Firestore document IDs |
| **Attribution Validation** | Model returns `{ answer, sourceIds[] }` via structured JSON output | Drops any returned `sourceId` that was not in context |
| **Deep Navigation** | Tapping a source chip opens `memories/[id]` | Direct link to underlying source memory card |
| **Honest Refusal** | Instructed prompt: "Answer only from context" | States clearly when no record exists; never hallucinates |

---

<a id="vi-reminders-and-delivery"></a>

## 06 · Reminders & spoken delivery

Reminders are saved with concrete ISO timestamps and real scheduled dates.

- **Foreground spoken mode**: When a reminder is due while Ranti is open, `expo-speech` reads the title aloud (`"Reminder: Pick up dry cleaning"`).
- **Date & time picker**: Creating a reminder provides a real date and time modal picker, saving a true `Reminder` entity rather than a generic task.
- **Expo Go compatibility**: Native background push notifications require a custom dev build on Android. To ensure seamless operation in standard Expo Go, `reminderScheduler.ts` manages in-memory foreground timers and clean stubs without crashing native module loaders.

---

<a id="vii-privacy"></a>

## 07 · Privacy & data sovereignty

Ranti's value rests entirely on trust. We state our technical boundaries plainly:

### What is true and what is disclosed

- **Cloud processing disclosure**: Audio is transmitted securely over HTTPS to Meta's Cloud API endpoints for speech recognition and extraction. **Ranti does not claim on-device processing.**
- **First-use transparency**: A dedicated Privacy & Data notice is presented on first launch before onboarding, detailing what is recorded, where audio is processed, what is stored in Firestore, and how to delete it.
- **Real "Delete all my data"**: In Settings, a dedicated destructive action permanently erases:
  1. All user documents across `memories`, `tasks`, `reminders`, `events`, and `chat` collections in Cloud Firestore.
  2. All local voice samples and settings files from `expo-file-system`.
  3. Clears in-memory TanStack query caches and routes back to a clean onboarding screen.

---

<a id="viii-the-decisions"></a>

## 08 · Engineering decisions

Key architectural decisions made across the codebase:

<details>
<summary><strong>1. Schema-enforced structured output over prose extraction</strong></summary>

Asking an LLM for "JSON in markdown fences" frequently returns malformed keys, markdown wrapping, or unexpected structures. Ranti uses Meta's structured output API with strict JSON schema definitions, backed by TypeScript validation. Invalid items are repaired or dropped rather than crashing the runtime.

</details>

<details>
<summary><strong>2. Injected temporal grounding with device timezone</strong></summary>

An LLM has no concept of when "now" is. Without grounding, *"Doctor's appointment tomorrow at 10"* cannot resolve to a calendar date. Ranti injects the current ISO datetime (`new Date().toISOString()`) and device timezone directly into the system prompt. If the user says *"sometime next week"*, the model returns `null` for time rather than inventing an hour.

</details>

<details>
<summary><strong>3. Decoupling demo identity into persisted user preferences</strong></summary>

Hardcoded demo strings ("Morning, Alex", "What does Maya like?") create fragile demos. Ranti persists a user-defined display name during onboarding (`userSettingsService`) and generates assistant suggestions dynamically from real recorded memories. If no memories exist, neutral contextual prompts are shown.

</details>

<details>
<summary><strong>4. Shared audio recorder state subscription</strong></summary>

To prevent conflicting microphone states between the Settings toggle, the Assistant dictation button, and background listening, `audioRecorder.ts` implements an `onStateChange` listener pattern. Toggling listening anywhere updates all visible controls simultaneously.

</details>

<details>
<summary><strong>5. Zero fake-ID fallbacks in storage error handling</strong></summary>

Catching a Firestore write error and returning a temporary fake ID (`temp-${Date.now()}`) creates phantom data that disappears on reload. `storage.ts` strips `undefined` fields to satisfy Firestore requirements, sets explicit defaults, and allows real errors to propagate so the UI can display an honest retry state.

</details>

<details>
<summary><strong>6. Memory management: in-place edit and delete with confirmation</strong></summary>

The ellipsis menu on memory detail screens is fully wired to Firestore mutations:

- **Edit**: Updates memory title and content in-place with real-time optimistic cache updates.
- **Delete**: Displays native alert confirmation, deletes the Firestore document, cancels in-flight queries, and navigates back smoothly.

</details>

<details>
<summary><strong>7. Removing native notification modules for Expo Go stability</strong></summary>

`expo-notifications` requires a compiled development build on Android to initialize `ExpoTopicSubscriptionModule`. To allow reviewers and hackathon judges to run the project instantly in standard Expo Go, native push notification channels were replaced with in-memory foreground timers and `expo-speech` spoken delivery.

</details>

<details>
<summary><strong>8. Strict 350-line file limit enforcement</strong></summary>

To prevent monolithic files and maintain modular readability, every file in `src/` is strictly capped under 350 lines of code. Shared logic (e.g., `PrivacyNoticeModal`, `SettingsRow`) is factored into dedicated components.

</details>

---

<a id="ix-the-map"></a>

## 09 · Repository map

4,487 lines of TypeScript across `src/`.

| Directory | Lines | Responsibility |
| :--- | ---: | :--- |
| [`src/app/`](src/app/) | 2,241 | Expo Router screen layouts, onboarding, tabs, memory detail, settings |
| [`src/services/`](src/services/) | 1,305 | Meta inference APIs, Firestore storage, audio recording, local settings |
| [`src/hooks/`](src/hooks/) | 467 | React Query hooks (`useMemories`, `useTasks`, `useReminders`, `useListeningSession`, `useDictation`) |
| [`src/components/`](src/components/) | 349 | Reusable UI primitives (`Button`, `Card`, `SettingsRow`, `Switch`, `PrivacyNoticeModal`) |
| [`src/types/`](src/types/) | 75 | Shared domain interfaces and schemas |
| [`src/lib/`](src/lib/) | 19 | Central color map matching Tailwind theme tokens |

<details>
<summary><strong>Open the full source map</strong></summary>

```text
src/
  app/
    _layout.tsx                     Root navigator, font loading, onboarding routing
    index.tsx                       Welcome screen & first-use privacy disclosure
    voice-setup.tsx                 Sound check, live metering waveform & profile name
    api-check.tsx                   Dev API connection verification screen
    (tabs)/
      _layout.tsx                   Tab navigation bar (Today, Memories, Assistant, Reminders, Settings)
      today.tsx                     Up Next briefing, daily tasks & reminders
      memories/
        index.tsx                   Filterable memory cards with search & loading/error states
        [id].tsx                    Memory detail with edit modal, delete alert & assistant handoff
      assistant.tsx                 Contextual RAG chat with verified source chips & dictation mic
      reminders.tsx                 Upcoming reminders, spoken toggle & date/time picker
      settings.tsx                  Listening toggle, audio delivery, privacy modal, "Delete all data"

  services/
    audioRecorder.ts                expo-audio recorder with onStateChange broadcast
    firebase.ts                     Cloud Firestore initialization
    firebaseConfig.ts               Environment credentials & default user namespace
    metaExtractor.ts                Llama 3.3 schema-enforced structured extraction
    metaRealtimeClient.ts           Streaming speech recognition client
    metaRecall.ts                   Contextual RAG retrieval with verified source attribution
    queryClient.ts                  TanStack React Query singleton
    reminderScheduler.ts            In-memory reminder timers & expo-speech foreground audio
    storage.ts                      Strict Firestore CRUD & deleteAllUserData wipe
    userSettings.ts                 Local preferences & clearAllLocalData file wipe

  hooks/
    useListeningSession.ts          Speech extraction loop with rolling deduplication
    useDictation.ts                 Assistant mic button recording & transcription
    useMemories.ts                  Memories query, add, edit, and optimistic delete
    useTasks.ts                     Task list query and toggle mutation
    useReminders.ts                 Reminders query, add, and status toggle

  components/
    Button.tsx                      Primary, outline & ghost buttons with loading spinners
    Card.tsx                        Standard card container
    FilterPill.tsx                  Category filter pill
    MemoryListItem.tsx              Memory card with category badge and timestamp
    PrivacyNoticeModal.tsx          Full privacy policy & data transparency modal
    SettingsRow.tsx                 Settings item with icon, switch/chevron, and destructive styling
    Switch.tsx                      Accessible toggle switch
```

</details>

---

<a id="x-running-it"></a>

## 10 · Run locally

Node 20+, pnpm (or bun/npm), and the **Expo Go** app on an Android device or emulator.

### 1 · Clone & install dependencies

```bash
git clone https://github.com/abrahamebij/ranti.git
cd ranti
pnpm install
```

### 2 · Configure environment

Create a `.env` file in the root directory:

```dotenv
# Meta Model API
EXPO_PUBLIC_META_API_KEY=your_meta_api_key_here

# Firebase / Cloud Firestore
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3 · Start Expo dev server

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android device, or press `a` to launch in an Android emulator.

---

<a id="xi-what-is-true-and-what-is-not"></a>

## 11 · What works today

This is the repository's recorded verification status. Everything below has been verified on a physical Android device running Expo SDK 57.

<details open>
<summary><strong>Observed on device</strong></summary>

| Capability | Observed behavior |
| :--- | :--- |
| **Microphone Sound Check** | Live sound test in `voice-setup.tsx` requests microphone permissions, renders live audio metering bars, records a real local M4A sample, and enables playback. |
| **Assistant Dictation** | Tapping the mic button in Assistant records audio, transcribes it via Meta's API, and automatically populates the chat input with recording/transcribing indicators. |
| **Schema Extraction** | Spoken phrases are parsed by Meta Llama into structured JSON matching strict schemas (`memories`, `tasks`, `reminders`, `events`). |
| **Temporal Grounding** | Relative deadlines (e.g. "tomorrow at 3pm") resolve accurately based on the device's actual ISO datetime and local timezone. |
| **Contextual Assistant Recall** | Asking *"Where did I put my keys?"* answers from real stored memories and displays a tappable source chip opening the memory detail screen. |
| **Honest Refusal** | Asking questions with no backing data returns a straightforward refusal (*"I don't have a record of that"*) rather than a hallucination. |
| **Memory Edit & Delete** | Detail screen ellipsis menu supports editing title/content and deleting memories with confirmation alerts and instant cache rollback on error. |
| **Complete Data Erasure** | Tapping "Delete all my data" in Settings wipes all Firestore documents across user collections, erases local files from `expo-file-system`, clears query cache, and resets onboarding state. |

</details>

<details>
<summary><strong>Built, not observed end to end</strong></summary>

- **Continuous 24/7 background audio**: While the audio session architecture supports continuous listening, mobile OS battery optimization (Android Doze mode) may throttle background audio capture when the app is suspended for prolonged periods without a foreground service notification.
- **Multi-speaker diarization**: When multiple people speak simultaneously, the model extracts the combined transcript facts without attributing distinct speaker identities.

</details>

<details>
<summary><strong>Deliberately absent</strong></summary>

- **No fake mock data**: Zero hardcoded demo personas ("Alex", "Maya") remain in user-facing flows. All views render real data, loading skeletons, or empty states.
- **No silent error swallowing**: Firestore writes throw typed `StorageError` exceptions; no temporary fake IDs are generated on failure.
- **No on-device AI claims**: All speech-to-text and reasoning APIs run over secure HTTPS via Meta Cloud APIs, as stated in the in-app privacy policy.
- **No native build dependency**: Native push notifications (`expo-notifications`) were replaced with in-memory foreground timers and `expo-speech` to guarantee standard Expo Go compatibility.

</details>

---

<p align="center">
  <br>
  <strong>Ranti</strong><br>
  <sub>A little more to remember.</sub><br><br>
  <a href="#top">Back to top ↑</a>
</p>
