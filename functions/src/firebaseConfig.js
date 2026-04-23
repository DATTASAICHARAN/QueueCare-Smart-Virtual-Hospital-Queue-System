import { initializeApp } from "firebase/app";

const firebaseConfig = {
  projectId: "cureq-eb02c",
  appId: "1:398977207194:web:f7fb9ab9f28b6512350823",
  storageBucket: "cureq-eb02c.firebasestorage.app",
  apiKey: "AIzaSyB2K8j_eKk_1lxfFuavEeqvLPSCkgBuN78",
  authDomain: "cureq-eb02c.firebaseapp.com",
  messagingSenderId: "398977207194"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;
