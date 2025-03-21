// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBObI5V6saq6I6YofD2TVbavRWCHBg0Pqg",
  authDomain: "teacher-attendance-11300.firebaseapp.com",
  projectId: "teacher-attendance-11300",
  storageBucket: "teacher-attendance-11300.appspot.com",
  messagingSenderId: "289899369388",
  appId: "1:289899369388:web:880c6a00d990da08746009",
  measurementId: "G-5ZQV5BLP0P",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/firebase-logo.png", // Optional: Add an icon in your public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
