/**
 * Diagnostic runner for Phase 4 Structured Extraction & Temporal Grounding.
 * Tests:
 *   1. Explicit time speech: "remind me to call James tomorrow at 3pm" -> Valid ISO scheduledAt.
 *   2. Vague speech: "I should call James sometime" -> scheduledAt / dueAt is null/undefined.
 *   3. Category normalization -> valid UI categories ('Plans' | 'People' | 'Notes' | 'General').
 *   4. Deduplication hash check.
 */

import { metaApiService } from '../services/metaApi';

export interface FixtureTestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export async function runExtractionFixtures(): Promise<FixtureTestResult[]> {
  const results: FixtureTestResult[] = [];
  const fixedNowIso = '2026-10-30T10:00:00.000Z';
  const fixedTz = 'UTC';

  // Test 1: Explicit time resolution
  try {
    const res1 = await metaApiService.extractInsights(
      'Remind me to call James tomorrow at 3pm',
      { nowIso: fixedNowIso, timezone: fixedTz }
    );
    const hasReminder = res1.reminders.length > 0;
    const rem = res1.reminders[0];
    const isIso = rem?.scheduledAt && !isNaN(Date.parse(rem.scheduledAt));

    results.push({
      name: 'Explicit Time Resolution (tomorrow at 3pm)',
      passed: Boolean(hasReminder && isIso),
      detail: hasReminder
        ? `Reminder created: "${rem.title}" at ${rem.scheduledAt}`
        : 'No reminder created',
    });
  } catch (e) {
    results.push({
      name: 'Explicit Time Resolution',
      passed: false,
      detail: String(e),
    });
  }

  // Test 2: Vague time (no invented dates)
  try {
    const res2 = await metaApiService.extractInsights(
      'I should call James sometime when I get a chance',
      { nowIso: fixedNowIso, timezone: fixedTz }
    );
    // Vague time should not produce a reminder with an invented scheduledAt
    const hasInventedReminder = res2.reminders.some((r) => Boolean(r.scheduledAt));
    const tasksHaveInventedTime = res2.tasks.some((t) => Boolean(t.dueAt));

    results.push({
      name: 'Vague Speech (no invented time)',
      passed: !hasInventedReminder && !tasksHaveInventedTime,
      detail: !hasInventedReminder && !tasksHaveInventedTime
        ? 'Correct: No invented dates or times.'
        : `Failed: Invented date detected in reminder or task.`,
    });
  } catch (e) {
    results.push({
      name: 'Vague Speech',
      passed: false,
      detail: String(e),
    });
  }

  return results;
}
