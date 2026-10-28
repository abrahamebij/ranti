export type MemoryCategory = 'Plans' | 'People' | 'Notes' | 'General';

export interface PersonMention {
  name: string;
  relation?: string;
}

export interface Memory {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: MemoryCategory;
  people: PersonMention[];
  sourceTimestamp?: string;
  relatedEventIds?: string[];
  confidence?: number;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  scheduledAt: string; // ISO string
  status: 'pending' | 'delivered' | 'dismissed';
  deliveryPreference?: 'audio' | 'notification';
  sourceMemoryIds?: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  dueAt?: string;
  completed: boolean;
  time?: string;
  sourceMemoryIds?: string[];
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  startAt?: string;
  location?: string;
  people?: string[];
  sourceMemoryIds?: string[];
  createdAt: string;
}

export interface ListeningSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'paused' | 'stopped';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
  sourceMemoryTitle?: string;
  sourceMemoryId?: string;
}

export interface ExtractedInsights {
  memories: Array<Omit<Memory, 'id' | 'userId' | 'createdAt'>>;
  tasks: Array<Omit<Task, 'id' | 'userId' | 'createdAt'>>;
  reminders: Array<Omit<Reminder, 'id' | 'userId' | 'createdAt'>>;
  events: Array<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>>;
}
