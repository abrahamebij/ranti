import { firebaseConfig, defaultUserId, isFirebaseConfigured } from './firebaseConfig';

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';

// Convert a plain JS value to Firestore REST Value
function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert Firestore REST Value to plain JS value
function fromFirestoreValue(val: Record<string, unknown>): unknown {
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue as string, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const arr = (val.arrayValue as { values?: Record<string, unknown>[] })?.values ?? [];
    return arr.map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = (val.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields ?? {};
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export const firestoreRest = {
  isEnabled(): boolean {
    return isFirebaseConfigured;
  },

  async getCollection<T>(collection: string): Promise<T[]> {
    if (!this.isEnabled()) return [];
    const url = `${FIRESTORE_BASE}/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${defaultUserId}/${collection}?key=${firebaseConfig.apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.documents) return [];
      return data.documents.map((doc: { name: string; fields?: Record<string, Record<string, unknown>> }) => {
        const id = doc.name.split('/').pop() || '';
        const fields = doc.fields || {};
        const plain: Record<string, unknown> = { id };
        for (const [k, v] of Object.entries(fields)) {
          plain[k] = fromFirestoreValue(v);
        }
        return plain as T;
      });
    } catch (e) {
      console.warn(`Firestore GET ${collection} error:`, e);
      return [];
    }
  },

  async addDocument<T extends { id?: string }>(collection: string, item: T): Promise<void> {
    if (!this.isEnabled()) return;
    const documentId = item.id || `doc-${Date.now()}`;
    const url = `${FIRESTORE_BASE}/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${defaultUserId}/${collection}?documentId=${documentId}&key=${firebaseConfig.apiKey}`;
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(item)) {
      if (k === 'id') continue;
      fields[k] = toFirestoreValue(v);
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
    } catch (e) {
      console.warn(`Firestore POST ${collection} error:`, e);
    }
  },

  async updateDocument(collection: string, docId: string, fieldsToUpdate: Record<string, unknown>): Promise<void> {
    if (!this.isEnabled()) return;
    const updateMask = Object.keys(fieldsToUpdate).map((f) => `updateMask.fieldPaths=${f}`).join('&');
    const url = `${FIRESTORE_BASE}/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${defaultUserId}/${collection}/${docId}?${updateMask}&key=${firebaseConfig.apiKey}`;
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fieldsToUpdate)) {
      fields[k] = toFirestoreValue(v);
    }

    try {
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
    } catch (e) {
      console.warn(`Firestore PATCH ${collection}/${docId} error:`, e);
    }
  },
};
