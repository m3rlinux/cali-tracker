// Cali Tracker — Firebase (valori pubblici: la protezione è nelle security rules).
// Compila questo file e firestore.rules (stessa email admin). Vedi FIREBASE.md.
window.CALI_FIREBASE = {
  config: {
    apiKey: "AIzaSyAKS3-pkyl80nqgnuRtUfdzqknLs56zNCQ",
    authDomain: "cali-tracker-647fe.firebaseapp.com",
    projectId: "cali-tracker-647fe",
    storageBucket: "cali-tracker-647fe.firebasestorage.app",
    messagingSenderId: "410201143022",
    appId: "1:410201143022:web:6fb4ba49718fa0221fe5ff"
  },
  // Stessa lista in firestore.rules → function isAdmin()
  adminEmails: [
    'm3rlinux.it@gmail.com'
  ]
};
