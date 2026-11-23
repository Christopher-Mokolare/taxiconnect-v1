// Firebase Web App configuration is public client configuration, not a server secret.
// Copy these values from Firebase Console > Project settings > Your apps.
// Never put service-account credentials, private keys, admin tokens or staff passwords here.
window.FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_FIREBASE_WEB_API_KEY",
  authDomain: "taxiconnect-dev.firebaseapp.com",
  databaseURL: "https://taxiconnect-dev-default-rtdb.firebaseio.com",
  projectId: "taxiconnect-dev",
  storageBucket: "taxiconnect-dev.appspot.com",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId: "REPLACE_WITH_WEB_APP_ID"
};

window.TAXICONNECT_CONFIGURED = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "projectId",
  "appId"
].every(key => {
  const value = window.FIREBASE_CONFIG[key];
  return typeof value === "string" && value.length > 0 && !value.startsWith("REPLACE_WITH");
});

if (!window.TAXICONNECT_CONFIGURED) {
  console.error("TaxiConnect setup required: configure public/firebase-config.js from Firebase Console.");
  document.addEventListener("DOMContentLoaded", () => {
    const notice = document.createElement("div");
    notice.setAttribute("role", "alert");
    notice.style.cssText = "position:relative;z-index:9999;margin:12px;padding:14px 16px;border:1px solid #d97706;border-radius:12px;background:#fff7ed;color:#7c2d12;font:600 14px/1.5 system-ui,sans-serif";
    notice.textContent = "TaxiConnect setup required: add the Firebase Web App values to public/firebase-config.js before signing in or using live taxi data.";
    document.body.prepend(notice);
  });
}
