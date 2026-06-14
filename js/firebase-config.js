import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref as dbRef, onValue, set, remove, get, child, push } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

import { firebaseConfig, adminEmail } from "./firebase-config-keys.js";

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

export { 
    app, 
    auth, 
    db, 
    storage, 
    adminEmail, 
    firebaseConfig,
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup, 
    dbRef, 
    onValue, 
    set, 
    remove, 
    get, 
    child, 
    storageRef, 
    uploadBytes, 
    getDownloadURL,
    push 
};
