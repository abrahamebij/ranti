import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { defaultUserId } from './firebaseConfig';
import { Memory, Task, Reminder, CalendarEvent, ChatMessage } from '../types';

export class StorageError extends Error {
  constructor(message: string, public readonly collectionName: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

function cleanRecord<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export const storageService = {
  // Memories
  async getMemories(): Promise<Memory[]> {
    if (!db) throw new StorageError('Firestore database not initialized', 'memories');
    try {
      const colRef = collection(db, 'users', defaultUserId, 'memories');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Memory, 'id'>),
      }));
    } catch (e) {
      throw new StorageError(`Failed to fetch memories: ${e instanceof Error ? e.message : String(e)}`, 'memories', e);
    }
  },

  async addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'userId'>): Promise<Memory> {
    if (!db) throw new StorageError('Firestore database not initialized', 'memories');
    const createdAt = new Date().toISOString();
    try {
      const colRef = collection(db, 'users', defaultUserId, 'memories');
      const cleanData = cleanRecord({
        title: memory.title || 'Untitled Memory',
        content: memory.content || '',
        category: memory.category || 'General',
        people: memory.people || [],
        sourceTimestamp: memory.sourceTimestamp || '',
        userId: defaultUserId,
        createdAt,
      });

      const docRef = await addDoc(colRef, cleanData);
      return {
        ...memory,
        id: docRef.id,
        userId: defaultUserId,
        createdAt,
      };
    } catch (e) {
      throw new StorageError(`Failed to save memory: ${e instanceof Error ? e.message : String(e)}`, 'memories', e);
    }
  },

  async updateMemory(memoryId: string, patch: Partial<Memory>): Promise<void> {
    if (!db) throw new StorageError('Firestore database not initialized', 'memories');
    try {
      const docRef = doc(db, 'users', defaultUserId, 'memories', memoryId);
      const cleanData = cleanRecord({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.people !== undefined ? { people: patch.people } : {}),
      });
      await updateDoc(docRef, cleanData);
    } catch (e) {
      throw new StorageError(`Failed to update memory: ${e instanceof Error ? e.message : String(e)}`, 'memories', e);
    }
  },

  async deleteMemory(memoryId: string): Promise<void> {
    if (!db) throw new StorageError('Firestore database not initialized', 'memories');
    try {
      const docRef = doc(db, 'users', defaultUserId, 'memories', memoryId);
      await deleteDoc(docRef);
    } catch (e) {
      throw new StorageError(`Failed to delete memory: ${e instanceof Error ? e.message : String(e)}`, 'memories', e);
    }
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    if (!db) throw new StorageError('Firestore database not initialized', 'tasks');
    try {
      const colRef = collection(db, 'users', defaultUserId, 'tasks');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, 'id'>),
      }));
    } catch (e) {
      throw new StorageError(`Failed to fetch tasks: ${e instanceof Error ? e.message : String(e)}`, 'tasks', e);
    }
  },

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'userId'>): Promise<Task> {
    if (!db) throw new StorageError('Firestore database not initialized', 'tasks');
    const createdAt = new Date().toISOString();
    try {
      const colRef = collection(db, 'users', defaultUserId, 'tasks');
      const cleanData = cleanRecord({
        title: task.title || 'Untitled Task',
        completed: Boolean(task.completed),
        dueAt: task.dueAt || null,
        time: task.time || null,
        userId: defaultUserId,
        createdAt,
      });

      const docRef = await addDoc(colRef, cleanData);
      return {
        ...task,
        id: docRef.id,
        userId: defaultUserId,
        createdAt,
      };
    } catch (e) {
      throw new StorageError(`Failed to save task: ${e instanceof Error ? e.message : String(e)}`, 'tasks', e);
    }
  },

  async toggleTask(taskId: string): Promise<Task[]> {
    if (!db) throw new StorageError('Firestore database not initialized', 'tasks');
    const all = await this.getTasks();
    const target = all.find((t) => t.id === taskId);
    if (!target) return all;

    const updatedStatus = !target.completed;
    try {
      const docRef = doc(db, 'users', defaultUserId, 'tasks', taskId);
      await updateDoc(docRef, { completed: updatedStatus });
      return all.map((t) => (t.id === taskId ? { ...t, completed: updatedStatus } : t));
    } catch (e) {
      throw new StorageError(`Failed to toggle task: ${e instanceof Error ? e.message : String(e)}`, 'tasks', e);
    }
  },

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    if (!db) throw new StorageError('Firestore database not initialized', 'reminders');
    try {
      const colRef = collection(db, 'users', defaultUserId, 'reminders');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Reminder, 'id'>),
      }));
    } catch (e) {
      throw new StorageError(`Failed to fetch reminders: ${e instanceof Error ? e.message : String(e)}`, 'reminders', e);
    }
  },

  async addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'userId'>): Promise<Reminder> {
    if (!db) throw new StorageError('Firestore database not initialized', 'reminders');
    const createdAt = new Date().toISOString();
    try {
      const colRef = collection(db, 'users', defaultUserId, 'reminders');
      const cleanData = cleanRecord({
        title: reminder.title || 'Untitled Reminder',
        scheduledAt: reminder.scheduledAt,
        status: reminder.status || 'pending',
        deliveryPreference: reminder.deliveryPreference || 'notification',
        notificationId: reminder.notificationId || null,
        sourceMemoryIds: reminder.sourceMemoryIds || [],
        userId: defaultUserId,
        createdAt,
      });

      const docRef = await addDoc(colRef, cleanData);
      return {
        ...reminder,
        id: docRef.id,
        userId: defaultUserId,
        createdAt,
      };
    } catch (e) {
      throw new StorageError(`Failed to save reminder: ${e instanceof Error ? e.message : String(e)}`, 'reminders', e);
    }
  },

  async updateReminder(reminderId: string, patch: Partial<Reminder>): Promise<void> {
    if (!db) throw new StorageError('Firestore database not initialized', 'reminders');
    try {
      const docRef = doc(db, 'users', defaultUserId, 'reminders', reminderId);
      const cleanData = cleanRecord({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.scheduledAt !== undefined ? { scheduledAt: patch.scheduledAt } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.deliveryPreference !== undefined ? { deliveryPreference: patch.deliveryPreference } : {}),
        ...(patch.notificationId !== undefined ? { notificationId: patch.notificationId } : {}),
      });
      await updateDoc(docRef, cleanData);
    } catch (e) {
      throw new StorageError(`Failed to update reminder: ${e instanceof Error ? e.message : String(e)}`, 'reminders', e);
    }
  },

  // Events
  async getEvents(): Promise<CalendarEvent[]> {
    if (!db) throw new StorageError('Firestore database not initialized', 'events');
    try {
      const colRef = collection(db, 'users', defaultUserId, 'events');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CalendarEvent, 'id'>),
      }));
    } catch (e) {
      throw new StorageError(`Failed to fetch events: ${e instanceof Error ? e.message : String(e)}`, 'events', e);
    }
  },

  async addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'userId'>): Promise<CalendarEvent> {
    if (!db) throw new StorageError('Firestore database not initialized', 'events');
    const createdAt = new Date().toISOString();
    try {
      const colRef = collection(db, 'users', defaultUserId, 'events');
      const cleanData = cleanRecord({
        title: event.title || 'Untitled Event',
        startAt: event.startAt || null,
        location: event.location || null,
        people: event.people || [],
        userId: defaultUserId,
        createdAt,
      });

      const docRef = await addDoc(colRef, cleanData);
      return {
        ...event,
        id: docRef.id,
        userId: defaultUserId,
        createdAt,
      };
    } catch (e) {
      throw new StorageError(`Failed to save event: ${e instanceof Error ? e.message : String(e)}`, 'events', e);
    }
  },

  // Chat
  async getChatMessages(): Promise<ChatMessage[]> {
    if (!db) throw new StorageError('Firestore database not initialized', 'chat');
    try {
      const colRef = collection(db, 'users', defaultUserId, 'chat');
      const q = query(colRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => {
        const data = d.data();
        let createdAt = data.createdAt;
        if (!createdAt || createdAt === 'Just now' || isNaN(Date.parse(createdAt))) {
          createdAt = new Date().toISOString();
        }
        return {
          id: d.id,
          sender: data.sender,
          text: data.text,
          createdAt,
          sourceMemoryTitle: data.sourceMemoryTitle || undefined,
          sourceMemoryId: data.sourceMemoryId || undefined,
        };
      });
    } catch (e) {
      throw new StorageError(`Failed to fetch chat messages: ${e instanceof Error ? e.message : String(e)}`, 'chat', e);
    }
  },

  async addChatMessage(msg: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    if (!db) throw new StorageError('Firestore database not initialized', 'chat');
    const createdAt = msg.createdAt && !isNaN(Date.parse(msg.createdAt))
      ? msg.createdAt
      : new Date().toISOString();

    try {
      const colRef = collection(db, 'users', defaultUserId, 'chat');
      const cleanData = cleanRecord({
        sender: msg.sender,
        text: msg.text,
        createdAt,
        sourceMemoryTitle: msg.sourceMemoryTitle || null,
        sourceMemoryId: msg.sourceMemoryId || null,
      });

      const docRef = await addDoc(colRef, cleanData);
      return {
        ...msg,
        id: docRef.id,
        createdAt,
      };
    } catch (e) {
      throw new StorageError(`Failed to save chat message: ${e instanceof Error ? e.message : String(e)}`, 'chat', e);
    }
  },

  async deleteAllUserData(): Promise<void> {
    if (!db) throw new StorageError('Firestore database not initialized', 'all');
    const collections = ['memories', 'tasks', 'reminders', 'events', 'chat'] as const;
    for (const col of collections) {
      try {
        const colRef = collection(db, 'users', defaultUserId, col);
        const snapshot = await getDocs(colRef);
        await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
      } catch (e) {
        throw new StorageError(`Failed to delete ${col}: ${e instanceof Error ? e.message : String(e)}`, col, e);
      }
    }
    try {
      const userDocRef = doc(db, 'users', defaultUserId);
      await deleteDoc(userDocRef);
    } catch {
      // Best effort for root user doc if created
    }
  },
};
