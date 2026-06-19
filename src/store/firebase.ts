import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCpiEyKmEYJYHCWL2tFjdFOqCxQyonsChk',
  authDomain: 'move-app-47c98.firebaseapp.com',
  projectId: 'move-app-47c98',
  storageBucket: 'move-app-47c98.firebasestorage.app',
  messagingSenderId: '864533264091',
  appId: '1:864533264091:web:fb8341971acdc840f97efe',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
