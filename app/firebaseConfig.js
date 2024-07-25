import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyC_qTMBlhPNheLo0y8cwaXPoB5iobVjEyM",
    authDomain: "bball-game.firebaseapp.com",
    projectId: "bball-game",
    storageBucket: "bball-game.appspot.com",
    messagingSenderId: "802693461397",
    appId: "1:802693461397:web:7e5d71c1ac11f1751f329c",
    measurementId: "G-EVX6ZFLHT3"
  };

  let app;
  let analytics;
  
  if (typeof window !== 'undefined') {
      if (!getApps().length) {
          app = initializeApp(firebaseConfig);
      } else {
          app = getApp();
      }
  
      // Initialize analytics only if supported and client-side
      isSupported().then(supported => {
          if (supported) {
              analytics = getAnalytics(app);
          }
      });
  } else {
      if (!getApps().length) {
          app = initializeApp(firebaseConfig);
      } else {
          app = getApp();
      }
  }
  
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  export { app, auth, db, analytics };
  