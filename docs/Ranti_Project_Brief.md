# Ranti — Project Brief

## 1. Project Overview

**Ranti** is an AI-powered personal memory assistant designed to help people who experience memory difficulties remember important information from everyday conversations.

The user activates listening mode in the morning. While listening mode is active, Ranti captures short audio segments, transcribes speech, identifies useful information, stores memories, and automatically creates reminders for relevant events and tasks.

Users can then ask Ranti questions about what they have heard, what they need to do, and what they may have forgotten. A dashboard provides a supporting overview of captured memories, tasks, events, and reminders.

This is a **hackathon project**, not a production-ready healthcare product. Keep the implementation focused on demonstrating the core experience rather than building a full-scale platform.

## 2. Primary Goal

Build an Android-first mobile application with Expo / React Native that can:

1. Capture speech while listening mode is enabled.
2. Transcribe captured speech using Meta's Muse Voice Transcribe model.
3. Use Muse Spark to extract meaningful memories, events, tasks, and commitments.
4. Store extracted information in Firebase.
5. Automatically create and schedule reminders.
6. Answer user questions using previously captured memories.
7. Deliver reminders through connected audio devices when possible, otherwise through a visual Android notification with a pinging sound.

## 3. Target User

People who experience memory difficulties and may benefit from support remembering everyday conversations, plans, appointments, tasks, and personal details.

The initial experience should be simple and accessible. Avoid unnecessary settings, complicated workflows, or a feature-heavy interface.

## 4. Core User Journey

1. The user opens Ranti and activates listening mode.
2. Ranti captures audio while the session is active.
3. Speech-containing segments are passed to the transcription model.
4. Transcribed text is analysed for useful information.
5. Ranti automatically stores relevant memories and creates reminders or tasks where appropriate.
6. The user can ask questions through the conversational interface.
7. Ranti answers using stored information and should clearly indicate when it cannot find a reliable answer.
8. The user can review captured information and upcoming reminders on the dashboard.
9. The user stops listening mode at the end of the day.

The hackathon implementation only needs to support a few hours of listening in a session; continuous all-day reliability is not a requirement.

## 5. Core Features

### 5.1 Listening Mode

- Provide a clear control to start and stop listening.
- Capture microphone audio while the session is active.
- Use lightweight speech detection or equivalent audio-segmentation logic to avoid processing silence unnecessarily.
- Pass speech segments to the transcription pipeline.
- Display the current listening state in the interface.
- Support a practical, testable session lasting a few hours; do not over-engineer for production-scale continuous recording.

### 5.2 Speech Transcription

- Use `muse-voice-transcribe-1.0` to convert audio into text.
- Integrate with the model through the supported API and audio format.
- Preserve useful timestamps and speaker/turn information if the model response provides them.
- Keep transcription separate from memory extraction so each stage can be tested independently.

### 5.3 Context Understanding and Extraction

Use `muse-spark-1.3` to analyse transcribed segments in context.

Extract useful information into structured records, including:

- **Memories:** Important facts and details from conversations.
- **Events:** Appointments, meetings, birthdays, and planned activities.
- **Tasks:** Actions the user needs to complete.
- **Commitments:** Things the user has promised to do.
- **People and relationships:** Names and relevant relationship context when clearly supported by conversation.
- **Preferences and routines:** Useful information that may support future assistance.

Ranti should distinguish clear plans from hypothetical ideas when the transcript provides enough context. It should combine related statements rather than create duplicate or contradictory records from each sentence.

### 5.4 Automatic Memory Storage

- Automatically save relevant extracted information to Firebase without requiring confirmation for each item.
- Store structured records rather than relying only on raw transcripts.
- Associate memories with their source time and relevant people or events where available.
- Support viewing, searching, and retrieving previously captured memories.
- Avoid creating a memory for every sentence; prioritise information likely to be useful later.

### 5.5 Automatic Reminders and Tasks

- Automatically create reminders for relevant appointments, tasks, deadlines, and commitments.
- Save reminders with a clear title, scheduled time, status, and source reference where available.
- Create follow-up tasks when they are directly implied by the conversation, such as collecting medication after an appointment.
- Handle dates and times using the user's configured timezone.
- Avoid inventing exact dates or times when the conversation does not establish them.
- Track reminder status so the same reminder is not repeatedly created or delivered accidentally.

### 5.6 Conversational Memory Assistant

The conversational interface is the **primary interface**.

Users should be able to ask questions such as:

- "What do I need to do today?"
- "What did I promise James?"
- "When is my next appointment?"
- "What did my lecturer ask me to do?"
- "Did anyone mention a birthday?"
- "What should I remember for tomorrow?"

Use `muse-spark-1.3` to interpret the question and generate an answer grounded in stored Firebase memories and relevant event/task records.

Do not let the model invent personal history. If the database does not contain a reliable answer, Ranti should say it could not find that information.

### 5.7 Supporting Dashboard

Provide a simple dashboard that helps the user review:

- Upcoming reminders.
- Today's tasks and events.
- Recently captured memories.
- Current listening status.

The dashboard supports the conversational assistant; it should not replace or overshadow the chat interface.

### 5.8 Reminder Delivery

- Prefer spoken reminders through connected earbuds or another compatible audio output when available and practical.
- Otherwise, display an Android notification accompanied by a pinging sound.
- Keep reminder text short, clear, and easy to understand.
- Use local notifications where appropriate so scheduled reminders can still be delivered when the app is not in the foreground.
- Include a reliable fallback when audio-device detection or spoken playback is unavailable.

## 6. Technology Stack

| Area | Technology |
|---|---|
| Mobile application | Expo / React Native |
| Initial target | Android |
| Speech transcription | `muse-voice-transcribe-1.0` |
| Context understanding, extraction, and conversational answers | `muse-spark-1.3` |
| Database | Firebase, preferably Cloud Firestore |
| Audio processing | Microphone capture plus lightweight speech detection/segmentation |
| Reminder delivery | Android notifications and audio playback |
| Backend/API layer | A small secure backend for model requests and Firebase operations, if required by the available API setup |

Do not add other AI models unless a specific requirement cannot be handled adequately by the selected models.

### Model allocation

- **`muse-voice-transcribe-1.0`:** Audio-to-text transcription.
- **`muse-spark-1.3`:** Context interpretation, structured memory/event/task extraction, and conversational recall grounded in Firebase data.

The other available models are not required for the initial implementation:
`muse-wonder-1.0`, `sam-3.1`, `muse-image-1.0`, `muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-spark-1.2-contributor`, and `muse-spark-1.1`.

## 7. Proposed Processing Pipeline

```text
Listening mode enabled
        |
        v
Capture microphone audio
        |
        v
Detect speech / segment audio
        |
        v
muse-voice-transcribe-1.0
        |
        v
Transcript segments with available timestamps/context
        |
        v
muse-spark-1.3
        |
        +-----------------------+
        |           |           |
        v           v           v
     Memories     Events       Tasks
        |           |           |
        +-----------+-----------+
                    |
                    v
              Firebase storage
                    |
          +---------+----------+
          |                    |
          v                    v
   Conversational recall   Reminder scheduler
                               |
                               v
                   Earbud speech or notification
```

Do not invoke Muse Spark for every tiny fragment of speech. Accumulate enough transcript context to identify meaningful information, then analyse it. Keep transcription, extraction, storage, and scheduling as separate components so they can be tested independently.

## 8. Suggested Firebase Data Model

Use user-scoped records and clear ownership. A possible initial structure is:

```text
users/{userId}
  memories/{memoryId}
  reminders/{reminderId}
  tasks/{taskId}
  events/{eventId}
  listeningSessions/{sessionId}
```

Suggested fields:

### Memory
- `content`
- `category`
- `sourceTimestamp`
- `people`
- `relatedEventIds`
- `confidence`
- `createdAt`

### Reminder
- `title`
- `scheduledAt`
- `status`
- `deliveryPreference`
- `sourceMemoryIds`
- `createdAt`

### Task
- `title`
- `dueAt` (optional)
- `completed`
- `sourceMemoryIds`
- `createdAt`

### Event
- `title`
- `startAt` (optional when unclear)
- `location` (optional)
- `people`
- `sourceMemoryIds`
- `createdAt`

### Listening session
- `startedAt`
- `endedAt`
- `status`

These fields are a starting point, not a requirement to implement every field immediately. Keep the schema small enough for a hackathon while preserving the links between captured information and actions generated from it.

## 9. Interface Direction

Keep the interface simple, calm, and accessible.

### Main conversational screen
- Conversation history.
- Clear input for asking Ranti a question.
- Obvious listening status and start/stop control.
- Concise responses grounded in stored information.

### Dashboard
- Next reminder.
- Today's tasks and events.
- Recently captured memories.
- Clear path back to the conversational interface.

### General interface requirements
- Use clear labels and readable text.
- Avoid unnecessary decorative elements and feature clutter.
- Make the listening state immediately understandable.
- Keep the number of primary navigation destinations small.
- Treat the conversation interface as the main experience and the dashboard as secondary.

## 10. Implementation Phases

### Phase 1 — Foundation
- Set up the Expo / React Native Android project.
- Configure Firebase.
- Define the initial data types and Firestore structure.
- Establish the supported Meta API integration path.
- Keep credentials out of the mobile client when they are privileged.

### Phase 2 — Listening and Transcription
- Implement start/stop listening controls.
- Capture short audio segments.
- Implement speech detection or segmentation.
- Integrate `muse-voice-transcribe-1.0`.
- Test transcription with real audio from the target Android device.

### Phase 3 — Extraction and Memory
- Integrate `muse-spark-1.3`.
- Define a strict structured output format for memories, events, tasks, and reminders.
- Validate model outputs before writing them to Firebase.
- Implement basic duplicate detection and links back to source segments.

### Phase 4 — Reminder Scheduling
- Create reminders automatically from extracted information.
- Implement local notification scheduling.
- Add spoken reminder playback when a suitable audio output is available.
- Add notification-plus-ping fallback behaviour.

### Phase 5 — Conversational Recall
- Build the primary chat interface.
- Retrieve relevant records from Firebase for each question.
- Use Muse Spark to produce concise answers grounded in retrieved records.
- Handle questions with no reliable answer without inventing information.

### Phase 6 — Dashboard and Integration
- Build the supporting dashboard.
- Display upcoming reminders, today's tasks/events, recent memories, and listening status.
- Test the complete flow from audio capture to reminder delivery and conversational recall.

## 11. Scope Boundaries

For the initial hackathon version:

- Android only.
- Expo / React Native.
- Firebase persistence.
- A few hours of listening per session is sufficient.
- Use the two selected Meta models for the core AI pipeline.
- Automatically save memories and create reminders without per-item confirmation.
- Prioritise conversational recall, with a supporting dashboard.
- No image-generation or image-segmentation features are required.
- No need to build a production-scale continuous listening service.
- Do not spend time polishing the demo until the core application flow is working.

## 12. Definition of Done

The core implementation is complete when:

1. The user can start and stop listening mode on Android.
2. Captured speech can be transcribed using `muse-voice-transcribe-1.0`.
3. Muse Spark can extract structured memories and actionable events/tasks from the transcript.
4. Extracted records persist in Firebase.
5. Relevant reminders are scheduled automatically.
6. Reminders use spoken delivery through a suitable connected audio output when feasible, with a visual notification and pinging sound as fallback.
7. The user can ask questions and receive answers grounded in stored memories.
8. The dashboard displays useful reminders, tasks/events, recent memories, and listening status.
9. The core workflow can be tested end to end over a practical listening session.

## 13. Guiding Principle

**Ranti should remember useful things on the user's behalf and make them easy to retrieve at the right moment.**

Build the smallest reliable system that demonstrates this clearly. Prioritise the complete path from conversation to memory to useful action over extra features.
