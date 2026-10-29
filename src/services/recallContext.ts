import { Memory, Task, Reminder, CalendarEvent } from '../types';

export interface GroundingItem {
  id: string;
  type: 'memory' | 'task' | 'reminder' | 'event';
  title: string;
  text: string;
  date?: string;
  category?: string;
}

export interface GroundingContext {
  items: GroundingItem[];
  formattedContext: string;
  nowIso: string;
  timezone: string;
}

function scoreRelevance(query: string, text: string, createdAt?: string): number {
  const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const target = text.toLowerCase();
  let score = 0;

  for (const w of qWords) {
    if (target.includes(w)) {
      score += 3;
    }
  }

  // Recency bonus: if created within last 7 days, add bonus
  if (createdAt) {
    const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) score += 2;
    else if (ageHours < 168) score += 1;
  }

  return score;
}

export function buildGroundingContext(
  question: string,
  data: {
    memories: Memory[];
    tasks: Task[];
    reminders: Reminder[];
    events: CalendarEvent[];
  }
): GroundingContext {
  const nowIso = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const items: GroundingItem[] = [];

  // 1. Relevant Memories (score by query relevance and recency, cap top 8)
  const scoredMemories = data.memories
    .map((m) => ({
      memory: m,
      score: scoreRelevance(question, `${m.title} ${m.content} ${m.category} ${m.people.map((p) => p.name).join(' ')}`, m.createdAt),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  for (const { memory } of scoredMemories) {
    items.push({
      id: memory.id,
      type: 'memory',
      title: memory.title,
      text: `${memory.title} (${memory.category}): ${memory.content}`,
      date: memory.createdAt,
      category: memory.category,
    });
  }

  // 2. Open Tasks (uncompleted, cap top 6)
  const openTasks = data.tasks
    .filter((t) => !t.completed)
    .slice(0, 6);

  for (const t of openTasks) {
    items.push({
      id: t.id,
      type: 'task',
      title: t.title,
      text: `Task: ${t.title}${t.dueAt ? ` (due: ${t.dueAt})` : ''}${t.time ? ` [${t.time}]` : ''}`,
      date: t.dueAt,
    });
  }

  // 3. Upcoming Reminders (pending, cap top 6)
  const pendingReminders = data.reminders
    .filter((r) => r.status === 'pending')
    .slice(0, 6);

  for (const r of pendingReminders) {
    items.push({
      id: r.id,
      type: 'reminder',
      title: r.title,
      text: `Reminder: ${r.title} scheduled at ${r.scheduledAt}`,
      date: r.scheduledAt,
    });
  }

  // 4. Events (cap top 4)
  const upcomingEvents = data.events.slice(0, 4);
  for (const ev of upcomingEvents) {
    items.push({
      id: ev.id,
      type: 'event',
      title: ev.title,
      text: `Event: ${ev.title}${ev.startAt ? ` at ${ev.startAt}` : ''}${ev.location ? ` location: ${ev.location}` : ''}`,
      date: ev.startAt,
    });
  }

  const formattedContext = items.length === 0
    ? '(No records in database)'
    : items
        .map((item) => `[ID: ${item.id}] [${item.type.toUpperCase()}] ${item.text}`)
        .join('\n');

  return {
    items,
    formattedContext,
    nowIso,
    timezone,
  };
}
