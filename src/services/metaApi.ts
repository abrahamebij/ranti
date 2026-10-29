/**
 * Meta Model API service with strict JSON Schema structured output
 * and temporal grounding.
 */

import { ExtractedInsights, Memory, MemoryCategory } from '../types';
import { EXTRACTION_JSON_SCHEMA } from './extractionSchema';

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

export interface ExtractionContext {
  previousTranscriptChunk?: string;
  recentMemoryTitles?: string[];
  nowIso?: string;
  timezone?: string;
}

const VALID_CATEGORIES: Set<MemoryCategory> = new Set([
  'Plans',
  'People',
  'Notes',
  'General',
]);

export const metaApiService = {
  /**
   * Extract structured insights from speech transcript using muse-spark-1.3
   * with strict JSON schema enforcement and temporal grounding.
   */
  async extractInsights(
    transcript: string,
    context: ExtractionContext = {}
  ): Promise<ExtractedInsights> {
    if (!transcript || transcript.trim().length === 0) {
      return { memories: [], tasks: [], reminders: [], events: [] };
    }

    const nowIso = context.nowIso || new Date().toISOString();
    const tz =
      context.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';

    const recentTitles = context.recentMemoryTitles?.length
      ? `Recent saved memories (do not extract duplicates of these):\n- ${context.recentMemoryTitles.join('\n- ')}`
      : '';

    const prevChunk = context.previousTranscriptChunk
      ? `Previous conversation chunk for context:\n"${context.previousTranscriptChunk}"`
      : '';

    const systemPrompt = `You are Muse Spark 1.3, an AI assistant extracting memory records for people with memory difficulties.

Current Date/Time: ${nowIso}
Device Timezone: ${tz}

CRITICAL TEMPORAL RULES:
1. ONLY assign an ISO datetime (such as "2026-10-30T15:00:00") when the conversation explicitly establishes a clear, resolvable date or time (for example, "tomorrow at 3pm" relative to current time).
2. NEVER INVENT DATES OR TIMES. If the speaker says something vague like "I should call James sometime", the dueAt or scheduledAt MUST BE NULL.
3. If an event or reminder has NO resolvable scheduled time, do NOT create a reminder. Instead, create a task or note with dueAt as null.
4. Categorize memories strictly as: "Plans", "People", "Notes", or "General".

${recentTitles}
${prevChunk}`;

    const data = await metaRequest<ChatCompletionResponse>(
      '/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'muse-spark-1.3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: EXTRACTION_JSON_SCHEMA,
          },
        }),
      }
    );

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new MetaApiError(
        'muse-spark-1.3 returned empty content.',
        '/chat/completions',
        undefined,
        'empty_response'
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new MetaApiError(
        `muse-spark-1.3 returned invalid JSON: ${content.slice(0, 200)}`,
        '/chat/completions',
        undefined,
        'malformed_json',
        content
      );
    }

    const memories = (parsed.memories || []).map((m: any) => ({
      title: String(m.title || 'Untitled Memory').trim(),
      content: String(m.content || '').trim(),
      category: VALID_CATEGORIES.has(m.category) ? m.category : 'General',
      people: (m.people || []).map((p: any) => ({
        name: String(p.name || '').trim(),
        relation: p.relation ? String(p.relation).trim() : undefined,
      })),
    }));

    const tasks = (parsed.tasks || []).map((t: any) => ({
      title: String(t.title || 'Untitled Task').trim(),
      completed: Boolean(t.completed),
      dueAt: t.dueAt ? String(t.dueAt).trim() : undefined,
      time: t.time ? String(t.time).trim() : undefined,
    }));

    const reminders: any[] = [];
    for (const r of parsed.reminders || []) {
      if (r.scheduledAt && !isNaN(Date.parse(r.scheduledAt))) {
        reminders.push({
          title: String(r.title || 'Untitled Reminder').trim(),
          scheduledAt: String(r.scheduledAt).trim(),
          status: 'pending' as const,
          deliveryPreference: r.deliveryPreference === 'audio' ? 'audio' : 'notification',
        });
      } else {
        tasks.push({
          title: String(r.title || 'Untitled Task').trim(),
          completed: false,
          dueAt: undefined,
          time: undefined,
        });
      }
    }

    const events = (parsed.events || []).map((e: any) => ({
      title: String(e.title || 'Untitled Event').trim(),
      startAt: e.startAt ? String(e.startAt).trim() : undefined,
      location: e.location ? String(e.location).trim() : undefined,
      people: (e.people || []).map((p: any) => String(p).trim()),
    }));

    return { memories, tasks, reminders, events };
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

    const data = await metaRequest<ChatCompletionResponse>(
      '/chat/completions',
      {
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
      }
    );

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
