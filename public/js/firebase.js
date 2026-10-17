import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyClsuZODAjpjHl5hI8VLNt0qcJUY2BMF7M",
  authDomain: "todo-7d99a.firebaseapp.com",
  projectId: "todo-7d99a",
  storageBucket: "todo-7d99a.firebasestorage.app",
  messagingSenderId: "69504446922",
  appId: "1:69504446922:web:f6b185f6a5a8c0d1fbdf33"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
