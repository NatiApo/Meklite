import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const FirebaseBridge = {
  async ready() {
    return true;
  },

  onAuth(callback) {
    return onAuthStateChanged(auth, callback);
  },

  async signIn(identifier, password) {
    const email = identifier.includes("@") ? identifier : `${identifier}@meklite.local`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async signOut() {
    return await signOut(auth);
  },

  async getUserProfile(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() };
    }
    return null;
  },

  async updateLastLogin(uid) {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { lastLogin: new Date().toISOString() });
  },

  async loadDB() {
    const appDataRef = doc(db, "system", "appData");
    const snap = await getDoc(appDataRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  },

  async saveDB(data) {
    const appDataRef = doc(db, "system", "appData");
    await setDoc(appDataRef, data, { merge: true });
  },

  async logActivity(activity) {
    const logRef = collection(db, "activityLog");
    await addDoc(logRef, {
      ...activity,
      timestamp: new Date().toISOString()
    });
  },

  async changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user.");
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
  },

  authError(err) {
    if (!err) return "An unknown error occurred.";
    if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      return "Invalid username/email or password.";
    }
    if (err.code === "auth/too-many-requests") {
      return "Too many failed attempts. Please try again later.";
    }
    return err.message || String(err);
  }
};

window.FirebaseBridge = FirebaseBridge;
