import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref as dbRef, onValue, set, remove, get, child } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDRvkYXHUb42q2H8F_2687CTihtDDNuYQ4",
    authDomain: "website-track-service.firebaseapp.com",
    databaseURL: "https://website-track-service-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "website-track-service",
    storageBucket: "website-track-service.firebasestorage.app",
    messagingSenderId: "87573564376",
    appId: "1:87573564376:web:c93c07f0506d00535a00ad",
    measurementId: "G-64T8XNWK5F"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

const adminEmail = "dayatkemal16@gmail.com";

export { 
    app, 
    auth, 
    db, 
    storage, 
    adminEmail, 
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
    getDownloadURL 
};
