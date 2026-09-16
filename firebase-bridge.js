import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_GROUPS = [1,2,3,4,5,6].map(id => ({
  id,
  groupName: `Meklit ${id}`,
  description: `Meklit Group ${id}`,
  status: "Active"
}));

const DEFAULT_SETTINGS = {
  churchName: "ኢትዮጵያ ሐዋርያዊት ቤተክርስቲያን",
  department: "የወጣቶች መክሊት አገልግሎት ክፍል",
  formTitle: "የአባላት ገንዘብ መሰብሰቢያ ቅጽ",
  phone: "", email: "", address: "",
  verse: "“መዝገብህ ባለበት ልብህ ደግሞ በዚያ ይሆናልና።” ማቴ 6:21"
};

const readyPromise = Promise.resolve();

function clean(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([k,v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

function profileFromDoc(id, data) {
  if (!data) return null;
  return {
    ...data,
    uid: data.uid || id,
    id: data.id || id,
    fullName: data.fullName || data.displayName || data.email || "User",
    displayName: data.displayName || data.fullName || "User",
    username: data.username || data.email || "",
    email: data.email || "",
    role: data.role || "Staff",
    status: data.status || "Active",
    phone: data.phone || "",
    createdDate: data.createdDate || "",
    lastLogin: data.lastLogin || ""
  };
}

async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? profileFromDoc(uid, snap.data()) : null;
}

async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

async function loadDB() {
  const [settingsSnap, groupsSnap, usersSnap, candidatesSnap, fundsSnap, logsSnap] = await Promise.all([
    getDoc(doc(db, "settings", "system")),
    getDocs(collection(db, "groups")),
    getDocs(collection(db, "users")),
    getDocs(collection(db, "candidates")),
    getDocs(collection(db, "groupFunds")),
    getDocs(query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(1000)))
  ]);

  const candidates = await Promise.all(candidatesSnap.docs.map(async candidateDoc => {
    const c = { id: candidateDoc.id, ...candidateDoc.data() };
    const contributionSnap = await getDocs(collection(db, "candidates", candidateDoc.id, "contributions"));
    c.contributions = contributionSnap.docs
      .map(x => ({ id: x.id, ...x.data() }))
      .sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")));
    return c;
  }));

  return {
    settings: settingsSnap.exists() ? { ...DEFAULT_SETTINGS, ...settingsSnap.data() } : { ...DEFAULT_SETTINGS },
    users: usersSnap.docs.map(x => profileFromDoc(x.id, x.data())),
    groups: groupsSnap.empty ? DEFAULT_GROUPS : groupsSnap.docs.map(x => ({ id:x.id, ...x.data(), id: x.data().id ?? x.id })),
    groupFunds: fundsSnap.docs.map(x => ({ id:x.id, ...x.data() })),
    candidates,
    activityLog: logsSnap.docs.map(x => ({ id:x.id, ...x.data() }))
  };
}

async function saveDB(data) {
  const batch = writeBatch(db);

  batch.set(doc(db, "settings", "system"), clean(data.settings || DEFAULT_SETTINGS), { merge: true });

  for (const group of (data.groups || [])) {
    const id = String(group.id || group.groupId || crypto.randomUUID());
    batch.set(doc(db, "groups", id), clean({ ...group, id }), { merge: true });
  }

  // Passwords are deliberately never written to Firestore.
  for (const user of (data.users || [])) {
    const id = String(user.uid || user.id);
    if (!id || id === "undefined") continue;
    const safeUser = { ...user, uid:id, id };
    delete safeUser.password;
    delete safeUser.passwordHash;
    batch.set(doc(db, "users", id), clean(safeUser), { merge: true });
  }

  for (const fund of (data.groupFunds || [])) {
    const id = String(fund.id || crypto.randomUUID());
    batch.set(doc(db, "groupFunds", id), clean({ ...fund, id }), { merge: true });
  }

  for (const candidate of (data.candidates || [])) {
    const id = String(candidate.id || crypto.randomUUID());
    const candidateDoc = { ...candidate, id };
    const contributions = Array.isArray(candidateDoc.contributions) ? candidateDoc.contributions : [];
    delete candidateDoc.contributions;
    batch.set(doc(db, "candidates", id), clean(candidateDoc), { merge: true });
    for (const contribution of contributions) {
      const cid = String(contribution.id || crypto.randomUUID());
      batch.set(doc(db, "candidates", id, "contributions", cid), clean({ ...contribution, id:cid, candidateId:id }), { merge:true });
    }
  }

  // Existing activity entries are retained; new activity is written separately by logActivity().
  await batch.commit();
  return true;
}

async function logActivity({userId, action, description}) {
  const ref = doc(collection(db, "activityLogs"));
  await setDoc(ref, {
    userId: userId || auth.currentUser?.uid || "",
    action: action || "Activity",
    description: description || "",
    createdAt: serverTimestamp(),
    dateTime: new Date().toISOString().replace("T", " ").split(".")[0]
  });
}

async function updateLastLogin(uid) {
  await setDoc(doc(db, "users", uid), {
    lastLogin: new Date().toISOString(),
    updatedAt: serverTimestamp()
  }, { merge:true });
}

async function createProfile(data) {
  const uid = data.uid || auth.currentUser?.uid;
  if (!uid) throw new Error("No signed-in Firebase user.");
  await setDoc(doc(db, "users", uid), clean({
    ...data,
    uid,
    id: uid,
    displayName: data.displayName || data.fullName || "",
    fullName: data.fullName || data.displayName || "",
    email: data.email || auth.currentUser?.email || "",
    role: data.role || "Staff",
    status: data.status || "Active",
    createdAt: serverTimestamp()
  }), { merge:true });
}

async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No signed-in Firebase user.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

function authError(err) {
  const code = err?.code || "";
  const messages = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-login-credentials": "Invalid email or password.",
    "auth/user-not-found": "No Firebase account was found for this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This Firebase account is disabled.",
    "auth/too-many-requests": "Too many login attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "permission-denied": "Firebase permission denied. Check your Firestore Rules and user profile."
  };
  return messages[code] || err?.message || "Firebase authentication failed.";
}

window.FirebaseBridge = {
  ready: () => readyPromise,
  signIn,
  signOut: () => firebaseSignOut(auth),
  onAuth: callback => onAuthStateChanged(auth, callback),
  currentAuthUser: () => auth.currentUser,
  getUserProfile,
  loadDB,
  saveDB,
  logActivity,
  updateLastLogin,
  createProfile,
  changePassword,
  authError,
  firestore: db,
  auth
};
