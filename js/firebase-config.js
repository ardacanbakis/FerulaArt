/**
 * Ferula Art — Firebase Configuration
 * Using Firestore + Auth only (no Storage needed)
 */

const firebaseConfig = {
  apiKey: "AIzaSyBlIFZoi_VELBixmUO_Sx13rmd_iHEJ98U",
  authDomain: "ferula-art.firebaseapp.com",
  projectId: "ferula-art",
  storageBucket: "ferula-art.firebasestorage.app",
  messagingSenderId: "880280285878",
  appId: "1:880280285878:web:e6ceace2224ef9a40e6c17",
  measurementId: "G-Y8QL8KJ054"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services (no Storage)
const auth = firebase.auth();
const db = firebase.firestore();
