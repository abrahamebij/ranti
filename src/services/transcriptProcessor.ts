/**
 * Turns a transcript into saved memories, tasks, reminders and events.
 * Plain module (no React hooks) so the always-on listening provider and the
 * dev API check screen can share one implementation and one duplicate guard.
 */

import { MEMORIES_QUERY_KEY } from '../hooks/useMemories';
import { REMINDERS_QUERY_KEY } from '../hooks/useReminders';
import { TASKS_QUERY_KEY } from '../hooks/useTasks';
import { metaApiService } from './metaApi';
import { queryClient } from './queryClient';
import { reminderScheduler } from './reminderScheduler';
import { storageService } from './storage';

export const EVENTS_QUERY_KEY = ['events'];

const recentSavedHashes = new Set<string>();
let previousTranscriptChunk = '';

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts structured insights from a transcript and saves them.
 * Throws on API or storage failure so callers can show the error.
 */
export async function processTranscript(transcript: string): Promise<void> {
  if (!transcript || transcript.trim().length === 0) return;

  // Rolling context: recent memory titles help the model avoid duplicates.
  const existingMemories = await storageService.getMemories().catch(() => []);
  const recentMemoryTitles = existingMemories.slice(0, 5).map((m) => m.title);

  const insights = await metaApiService.extractInsights(transcript, {
    previousTranscriptChunk,
    recentMemoryTitles,
    nowIso: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  previousTranscriptChunk = transcript;

  let hasNewWrites = false;

  for (const mem of insights.memories) {
    const hash = normalizeText(mem.title);
    if (!recentSavedHashes.has(hash)) {
      recentSavedHashes.add(hash);
      await storageService.addMemory(mem);
      hasNewWrites = true;
    }
  }

  for (const task of insights.tasks) {
    const hash = normalizeText(task.title);
    if (!recentSavedHashes.has(hash)) {
      recentSavedHashes.add(hash);
      await storageService.addTask(task);
      hasNewWrites = true;
    }
  }

  for (const rem of insights.reminders) {
    const hash = normalizeText(rem.title + (rem.scheduledAt || ''));
    if (!recentSavedHashes.has(hash)) {
      recentSavedHashes.add(hash);
      const notifId = await reminderScheduler.scheduleReminder(rem);
      await storageService.addReminder({
        ...rem,
        notificationId: notifId || undefined,
      });
      hasNewWrites = true;
    }
  }

  for (const ev of insights.events) {
    const hash = normalizeText(ev.title + (ev.startAt || ''));
    if (!recentSavedHashes.has(hash)) {
      recentSavedHashes.add(hash);
      await storageService.addEvent(ev);
      hasNewWrites = true;
    }
  }

  // Keep the duplicate guard bounded.
  if (recentSavedHashes.size > 100) {
    recentSavedHashes.clear();
  }

  // Invalidate caches only after real, successful writes.
  if (hasNewWrites) {
    queryClient.invalidateQueries({ queryKey: MEMORIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: REMINDERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
  }
}
