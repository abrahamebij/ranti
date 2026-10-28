import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = isFirebaseConfigured ? getFirestore(app) : null;
export { app };
