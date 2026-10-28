import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { defaultUserId } from './firebaseConfig';
import { Memory, Task, Reminder, CalendarEvent, ChatMessage } from '../types';

export const storageService = {
  // Memories
  async getMemories(): Promise<Memory[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'users', defaultUserId, 'memories');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Memory, 'id'>),
      }));
    } catch (e) {
      console.warn('Firestore getMemories error:', e);
      return [];
    }
  },

  async addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'userId'>): Promise<Memory> {
    const newMemory: Memory = {
      ...memory,
      id: '',
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      try {
        const colRef = collection(db, 'users', defaultUserId, 'memories');
        const docRef = await addDoc(colRef, {
          title: newMemory.title,
          content: newMemory.content,
          category: newMemory.category,
          people: newMemory.people || [],
          sourceTimestamp: newMemory.sourceTimestamp || '',
          userId: defaultUserId,
          createdAt: newMemory.createdAt,
        });
        newMemory.id = docRef.id;
      } catch (e) {
        console.warn('Firestore addMemory error:', e);
        newMemory.id = `mem-${Date.now()}`;
      }
    } else {
      newMemory.id = `mem-${Date.now()}`;
    }

    return newMemory;
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'users', defaultUserId, 'tasks');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, 'id'>),
      }));
    } catch (e) {
      console.warn('Firestore getTasks error:', e);
      return [];
    }
  },

  async toggleTask(taskId: string): Promise<Task[]> {
    const all = await this.getTasks();
    const target = all.find((t) => t.id === taskId);
    if (!target) return all;

    const updatedStatus = !target.completed;

    if (db) {
      try {
        const docRef = doc(db, 'users', defaultUserId, 'tasks', taskId);
        await updateDoc(docRef, { completed: updatedStatus });
      } catch (e) {
        console.warn('Firestore toggleTask error:', e);
      }
    }

    return all.map((t) =>
      t.id === taskId ? { ...t, completed: updatedStatus } : t
    );
  },

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'userId'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: '',
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      try {
        const colRef = collection(db, 'users', defaultUserId, 'tasks');
        const docRef = await addDoc(colRef, {
          title: newTask.title,
          completed: newTask.completed,
          dueAt: newTask.dueAt || '',
          time: newTask.time || '',
          userId: defaultUserId,
          createdAt: newTask.createdAt,
        });
        newTask.id = docRef.id;
      } catch (e) {
        console.warn('Firestore addTask error:', e);
        newTask.id = `task-${Date.now()}`;
      }
    } else {
      newTask.id = `task-${Date.now()}`;
    }

    return newTask;
  },

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'users', defaultUserId, 'reminders');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Reminder, 'id'>),
      }));
    } catch (e) {
      console.warn('Firestore getReminders error:', e);
      return [];
    }
  },

  async addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'userId'>): Promise<Reminder> {
    const newReminder: Reminder = {
      ...reminder,
      id: '',
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      try {
        const colRef = collection(db, 'users', defaultUserId, 'reminders');
        const docRef = await addDoc(colRef, {
          title: newReminder.title,
          scheduledAt: newReminder.scheduledAt,
          status: newReminder.status,
          deliveryPreference: newReminder.deliveryPreference || 'notification',
          userId: defaultUserId,
          createdAt: newReminder.createdAt,
        });
        newReminder.id = docRef.id;
      } catch (e) {
        console.warn('Firestore addReminder error:', e);
        newReminder.id = `rem-${Date.now()}`;
      }
    } else {
      newReminder.id = `rem-${Date.now()}`;
    }

    return newReminder;
  },

  // Events
  async getEvents(): Promise<CalendarEvent[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'users', defaultUserId, 'events');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CalendarEvent, 'id'>),
      }));
    } catch (e) {
      console.warn('Firestore getEvents error:', e);
      return [];
    }
  },

  async addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'userId'>): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      ...event,
      id: '',
      userId: defaultUserId,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      try {
        const colRef = collection(db, 'users', defaultUserId, 'events');
        const docRef = await addDoc(colRef, {
          title: newEvent.title,
          startAt: newEvent.startAt || '',
          location: newEvent.location || '',
          people: newEvent.people || [],
          userId: defaultUserId,
          createdAt: newEvent.createdAt,
        });
        newEvent.id = docRef.id;
      } catch (e) {
        console.warn('Firestore addEvent error:', e);
        newEvent.id = `event-${Date.now()}`;
      }
    } else {
      newEvent.id = `event-${Date.now()}`;
    }

    return newEvent;
  },

  // Chat
  async getChatMessages(): Promise<ChatMessage[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'users', defaultUserId, 'chat');
      const q = query(colRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id'>),
      }));
    } catch (e) {
      console.warn('Firestore getChatMessages error:', e);
      return [];
    }
  },

  async addChatMessage(msg: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      ...msg,
      id: '',
    };

    if (db) {
      try {
        const colRef = collection(db, 'users', defaultUserId, 'chat');
        const docRef = await addDoc(colRef, {
          sender: newMsg.sender,
          text: newMsg.text,
          createdAt: newMsg.createdAt,
          sourceMemoryTitle: newMsg.sourceMemoryTitle || '',
          sourceMemoryId: newMsg.sourceMemoryId || '',
        });
        newMsg.id = docRef.id;
      } catch (e) {
        console.warn('Firestore addChatMessage error:', e);
        newMsg.id = `msg-${Date.now()}`;
      }
    } else {
      newMsg.id = `msg-${Date.now()}`;
    }

    return newMsg;
  },
};
