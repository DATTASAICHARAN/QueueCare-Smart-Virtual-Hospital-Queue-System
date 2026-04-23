import app from './firebaseConfig';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc, onSnapshot } from 'firebase/firestore';

export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  onSnapshot
};

// Local Simulation of Firebase Cloud Function for Twilio Reminders
// Sweeps the LIVE Firestore 'appointments' collection every 10 seconds 
// to look for 5-minute countdowns and marks them as sent.
// (In production, this should be a real Firebase Cloud Function running server-side)
setInterval(async () => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('status', 'in', ['pending', 'in-progress'])
    );
    const snap = await getDocs(q);
    
    snap.docs.forEach(async (document) => {
      const appointment = document.data();
      if (!appointment.reminderSent && appointment.projectedTime) {
        const timeDiffMs = new Date(appointment.projectedTime).getTime() - Date.now();
        const timeDiffMinutes = timeDiffMs / 60000;
        
        if (timeDiffMinutes <= 5 && timeDiffMinutes >= -5) {
          console.log(`[Cloud Function Mock] Sent Twilio reminder for appointment ${document.id}`);
          await updateDoc(doc(db, 'appointments', document.id), {
            reminderSent: true
          });
        }
      }
    });
  } catch (error) {
    // Ignore errors here if user is not logged in / lacks permission during sweep
  }
}, 10000);
