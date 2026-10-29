/**
 * Meta Model API service.
 *
 * Confirmed endpoints & contract (Meta Model Cookbook):
 *   POST https://api.meta.ai/v1/asr/transcribe
 *   Header: Authorization: Bearer <MODEL_API_KEY>
 *
 *   POST https://api.meta.ai/v1/chat/completions
 *   Header: Authorization: Bearer <MODEL_API_KEY>
 */

import { ExtractedInsights, Memory } from '../types';

const BASE_URL =
  process.env.EXPO_PUBLIC_META_API_ENDPOINT ?? 'https://api.meta.ai/v1';

const API_KEY = process.env.EXPO_PUBLIC_META_API_KEY ?? '';

const REQUEST_TIMEOUT_MS = 30_000;

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

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function metaRequest<T>(endpoint: string, init: RequestInit): Promise<T> {
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
      res.status === 400
        ? 'bad_request'
        : res.status === 401
          ? 'bad_key'
          : res.status === 404
            ? 'not_found'
            : res.status === 413
              ? 'payload_too_large'
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

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new MetaApiError(
      `Meta API ${endpoint} returned non-JSON response: ${rawBody.slice(0, 300)}`,
      endpoint,
      res.status,
      'malformed_json',
      rawBody
    );
  }
}

export const metaApiService = {
  /**
   * Transcribe audio placeholder.
   * Callers receive speech transcript or propagate error.
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    if (!API_KEY) {
      throw new MetaApiError(
        'META_API_KEY is not set.',
        '/asr/transcribe',
        undefined,
        'missing_key'
      );
    }

    const formData = new FormData();
    formData.append('request', {
      string: JSON.stringify({
        mode: 'PUSH_TO_TALK',
        model: 'muse-voice-transcribe-1.0',
        audioEncoding: 'WAV',
      }),
      type: 'application/json',
    } as unknown as Blob);

    formData.append('audio', {
      uri: audioUri,
      name: 'audio.wav',
      type: 'audio/wav',
    } as unknown as Blob);

    const data = await metaRequest<{ transcript?: string; turns?: Array<{ transcript: string }> }>(
      '/asr/transcribe',
      {
        method: 'POST',
        body: formData,
      }
    );

    return data.transcript || data.turns?.map((t) => t.transcript).join(' ') || '';
  },

  /**
   * Extract structured insights from transcript using muse-spark-1.3.
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
        'muse-spark-1.3 returned empty content.',
        '/chat/completions',
        undefined,
        'empty_response'
      );
    }

    try {
      const parsed = JSON.parse(content) as ExtractedInsights;
      return {
        memories: parsed.memories ?? [],
        tasks: parsed.tasks ?? [],
        reminders: parsed.reminders ?? [],
        events: parsed.events ?? [],
      };
    } catch {
      throw new MetaApiError(
        `muse-spark-1.3 returned invalid JSON: ${content.slice(0, 200)}`,
        '/chat/completions',
        undefined,
        'malformed_json',
        content
      );
    }
  },

  /**
   * Conversational recall grounded in stored memories using muse-spark-1.3.
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
        'muse-spark-1.3 returned empty content.',
        '/chat/completions',
        undefined,
        'empty_response'
      );
    }

    return { text, sourceMemory };
  },
};
