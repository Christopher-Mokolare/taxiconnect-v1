// Firebase Web App configuration is public client configuration, not a server secret.
// Replace the placeholder values using Firebase Console > Project settings > Your apps.
// Never place service-account credentials, private keys, or PINs in this file.
window.FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_FIREBASE_WEB_API_KEY",
  authDomain: "taxiconnect-dev.firebaseapp.com",
  databaseURL: "https://taxiconnect-dev-default-rtdb.firebaseio.com",
  projectId: "taxiconnect-dev",
  storageBucket: "taxiconnect-dev.appspot.com",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId: "REPLACE_WITH_WEB_APP_ID"
};
if (window.FIREBASE_CONFIG.apiKey.startsWith("REPLACE_WITH")) {
  console.error("TaxiConnect: configure public/firebase-config.js from Firebase Console before using the app.");
}
