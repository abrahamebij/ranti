import { Memory, Task, Reminder, CalendarEvent, ChatMessage } from '../types';
import { defaultUserId } from './firebaseConfig';
import { firestoreRest } from './firestoreRest';

export const storageService = {
  // Memories
  async getMemories(): Promise<Memory[]> {
    return await firestoreRest.getCollection<Memory>('memories');
  },

  async addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'userId'>): Promise<Memory> {
    const newMemory: Memory = {
      ...memory,
      id: `mem-${Date.now()}`,
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };
    await firestoreRest.addDocument('memories', newMemory);
    return newMemory;
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    return await firestoreRest.getCollection<Task>('tasks');
  },

  async toggleTask(taskId: string): Promise<Task[]> {
    const all = await firestoreRest.getCollection<Task>('tasks');
    const target = all.find((t) => t.id === taskId);
    const updatedStatus = target ? !target.completed : true;

    await firestoreRest.updateDocument('tasks', taskId, { completed: updatedStatus });
    return all.map((t) =>
      t.id === taskId ? { ...t, completed: updatedStatus } : t
    );
  },

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'userId'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };
    await firestoreRest.addDocument('tasks', newTask);
    return newTask;
  },

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return await firestoreRest.getCollection<Reminder>('reminders');
  },

  async addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'userId'>): Promise<Reminder> {
    const newReminder: Reminder = {
      ...reminder,
      id: `rem-${Date.now()}`,
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };
    await firestoreRest.addDocument('reminders', newReminder);
    return newReminder;
  },

  // Events
  async getEvents(): Promise<CalendarEvent[]> {
    return await firestoreRest.getCollection<CalendarEvent>('events');
  },

  async addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'userId'>): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}`,
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };
    await firestoreRest.addDocument('events', newEvent);
    return newEvent;
  },

  // Chat messages
  async getChatMessages(): Promise<ChatMessage[]> {
    return await firestoreRest.getCollection<ChatMessage>('chat');
  },

  async addChatMessage(msg: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
    };
    await firestoreRest.addDocument('chat', newMsg);
    return newMsg;
  },
};
