/**
 * Meta Model API service.
 *
 * Confirmed endpoints (docs: https://api.meta.ai/v1):
 *   POST /v1/asr/transcribe          — multipart file upload, returns { turns }
 *   POST /v1/chat/completions         — OpenAI-compatible, returns { choices }
 *
 * Auth: Authorization: Bearer <MODEL_API_KEY>
 *
 * Errors propagate as MetaApiError — callers must handle them and surface
 * meaningful messages to the user. No silent empty-returns.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { ExtractedInsights, Memory } from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.EXPO_PUBLIC_META_API_ENDPOINT ?? 'https://api.meta.ai/v1';

const API_KEY = process.env.EXPO_PUBLIC_META_API_KEY ?? '';

const REQUEST_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly rawBody?: string
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

// ---------------------------------------------------------------------------
// Response shapes (from docs)
// ---------------------------------------------------------------------------

interface AsrTurn {
  speaker: string;
  text: string;
}

interface AsrTranscribeResponse {
  turns: AsrTurn[];
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// ---------------------------------------------------------------------------
// Shared request helper
// ---------------------------------------------------------------------------

async function metaRequest<T>(
  endpoint: string,
  init: RequestInit
): Promise<T> {
  if (!API_KEY) {
    throw new MetaApiError(
      'META_API_KEY is not set. Add EXPO_PUBLIC_META_API_KEY to your .env file.',
      endpoint,
      undefined,
      'missing_key'
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new MetaApiError(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
        endpoint,
        undefined,
        'timeout'
      );
    }
    throw new MetaApiError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
      endpoint,
      undefined,
      'network_error'
    );
  }
  clearTimeout(timer);

  const rawBody = await res.text();

  if (!res.ok) {
    const code =
      res.status === 401 || res.status === 403
        ? 'auth_error'
        : res.status === 429
          ? 'rate_limit'
          : res.status >= 500
            ? 'server_error'
            : 'request_error';

    throw new MetaApiError(
      `Meta API ${endpoint} returned ${res.status}: ${rawBody.slice(0, 300)}`,
      endpoint,
      res.status,
      code,
      rawBody
    );
  }

  let parsed: T;
  try {
    parsed = JSON.parse(rawBody) as T;
  } catch {
    throw new MetaApiError(
      `Meta API ${endpoint} returned non-JSON response: ${rawBody.slice(0, 300)}`,
      endpoint,
      res.status,
      'malformed_json',
      rawBody
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const metaApiService = {
  /**
   * Transcribe a recorded audio file using muse-voice-transcribe-1.0.
   *
   * Endpoint: POST /v1/asr/transcribe
   * Transport: multipart/form-data with fields: model, file
   * Response: { turns: [{ speaker, text }] }
   *
   * Accepts a real local file:// URI.
   * Tries standard fetch multipart first. If that fails with an Android
   * multipart issue, falls back to FileSystem.uploadAsync.
   */
  async transcribeAudio(fileUri: string): Promise<string> {
    if (!API_KEY) {
      throw new MetaApiError(
        'META_API_KEY is not set. Add EXPO_PUBLIC_META_API_KEY to your .env file.',
        '/asr/transcribe',
        undefined,
        'missing_key'
      );
    }

    const isWav = fileUri.toLowerCase().endsWith('.wav');
    const mimeType = isWav ? 'audio/wav' : 'audio/m4a';
    const fileName = isWav ? 'audio.wav' : 'audio.m4a';

    let rawBody = '';
    let statusCode = 200;

    // 1. Primary method: standard FormData with fetch
    try {
      const formData = new FormData();
      formData.append('model', 'muse-voice-transcribe-1.0');
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as unknown as Blob);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(`${BASE_URL}/asr/transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          // Do NOT set Content-Type: multipart/form-data manually
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timer);
      statusCode = res.status;
      rawBody = await res.text();
    } catch (primaryErr: unknown) {
      if (__DEV__) {
        console.warn(
          '[metaApiService] Standard multipart fetch failed, attempting FileSystem.uploadAsync fallback:',
          primaryErr
        );
      }

      // 2. Fallback: native FileSystem.uploadAsync
      try {
        const uploadResult = await FileSystem.uploadAsync(
          `${BASE_URL}/asr/transcribe`,
          fileUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType,
            headers: {
              Authorization: `Bearer ${API_KEY}`,
            },
            parameters: {
              model: 'muse-voice-transcribe-1.0',
            },
          }
        );

        statusCode = uploadResult.status;
        rawBody = uploadResult.body;
      } catch (fallbackErr: unknown) {
        throw new MetaApiError(
          `Transcription upload failed across both fetch and uploadAsync: ${
            fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
          }`,
          '/asr/transcribe',
          undefined,
          'network_error'
        );
      }
    }

    if (statusCode < 200 || statusCode >= 300) {
      throw new MetaApiError(
        `Meta API /asr/transcribe returned ${statusCode}: ${rawBody.slice(0, 300)}`,
        '/asr/transcribe',
        statusCode,
        statusCode === 401 || statusCode === 403 ? 'auth_error' : 'request_error',
        rawBody
      );
    }

    let parsed: AsrTranscribeResponse;
    try {
      parsed = JSON.parse(rawBody) as AsrTranscribeResponse;
    } catch {
      throw new MetaApiError(
        `Meta API /asr/transcribe returned non-JSON response: ${rawBody.slice(0, 300)}`,
        '/asr/transcribe',
        statusCode,
        'malformed_json',
        rawBody
      );
    }

    if (!parsed.turns || parsed.turns.length === 0) {
      return '';
    }

    return parsed.turns.map((t) => t.text).join(' ').trim();
  },

  /**
   * Extract structured memories, tasks, reminders and events from a
   * transcript using muse-spark-1.3 in json_object mode.
   */
  async extractInsights(transcript: string): Promise<ExtractedInsights> {
    const systemPrompt = `You are an AI assistant that extracts structured information from conversation transcripts to help a user with memory difficulties.

Analyse the transcript and return a JSON object with these keys:
- memories: array of important facts, commitments or personal details worth remembering
- tasks: array of concrete actions the user needs to complete
- reminders: array of time-sensitive alerts with a scheduled time when mentioned
- events: array of calendar appointments or planned activities

Each memory: { title, content, category ("Plans"|"People"|"Notes"|"General"), people: [] }
Each task: { title, completed: false, dueAt (ISO or null), time (human label or null) }
Each reminder: { title, scheduledAt (ISO or null), status: "pending", deliveryPreference: "notification" }
Each event: { title, startAt (ISO or null), location (or null), people: [] }

Only extract information clearly present in the transcript. Do not invent details.
Return only the JSON object — no prose, no markdown fences.`;

    const data = await metaRequest<ChatCompletionResponse>('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'muse-spark-1.3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new MetaApiError(
        'muse-spark-1.3 returned an empty message content for extractInsights.',
        '/chat/completions',
        undefined,
        'empty_response'
      );
    }

    let parsed: ExtractedInsights;
    try {
      parsed = JSON.parse(content) as ExtractedInsights;
    } catch {
      throw new MetaApiError(
        `muse-spark-1.3 returned invalid JSON in extractInsights: ${content.slice(0, 200)}`,
        '/chat/completions',
        undefined,
        'malformed_json',
        content
      );
    }

    return {
      memories: parsed.memories ?? [],
      tasks: parsed.tasks ?? [],
      reminders: parsed.reminders ?? [],
      events: parsed.events ?? [],
    };
  },

  /**
   * Answer a user question grounded strictly in stored Firestore memories
   * using muse-spark-1.3.
   */
  async answerQuestion(
    question: string,
    memories: Memory[]
  ): Promise<{ text: string; sourceMemory?: Memory }> {
    if (memories.length === 0) {
      return {
        text: "I don't have any stored memories yet. Start a listening session and I will begin capturing information for you.",
      };
    }

    const memoryContext = memories
      .map((m, i) => `[${i + 1}] ${m.title} (${m.category}): ${m.content}`)
      .join('\n');

    const sourceMemory = memories.find(
      (m) =>
        question.toLowerCase().includes(m.title.toLowerCase()) ||
        m.content
          .toLowerCase()
          .includes(question.split(' ').slice(0, 4).join(' ').toLowerCase())
    );

    const data = await metaRequest<ChatCompletionResponse>('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'muse-spark-1.3',
        messages: [
          {
            role: 'system',
            content: `You are Ranti, a calm and concise memory assistant for someone with memory difficulties.
Answer the user's question using ONLY the memories listed below.
If the answer is not in the memories, say exactly: "I couldn't find that in your memories."
Do not guess, invent, or add information not present in the memories.

Memories:
${memoryContext}`,
          },
          { role: 'user', content: question },
        ],
      }),
    });

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new MetaApiError(
        'muse-spark-1.3 returned an empty response for answerQuestion.',
        '/chat/completions',
        undefined,
        'empty_response'
      );
    }

    return { text, sourceMemory };
  },
};
