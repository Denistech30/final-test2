// src/fcm.ts
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";
import { toast } from "react-toastify";

export const requestNotificationPermission = async (): Promise<
  string | null
> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission not granted");
    }
    if (!messaging) {
      throw new Error(
        "Firebase Messaging is not available in this environment"
      );
    }
    // Wait for the service worker registration to be ready
    const registration = await navigator.serviceWorker.ready;
    // Pass the registration to getToken to ensure correct SW is used
    const token = await getToken(messaging, {
      vapidKey:
        "BJN1nN2rNieG0ppCQCwsnwbmZmXZDcvpKzwdOjQZOBR5ZYWPRinzw2fT8JD2XddCzvfHLweRY421wUs0OMjMQK8",
      serviceWorkerRegistration: registration,
    });
    if (token) {
      console.log("FCM Token retrieved:", token);
      return token;
    } else {
      throw new Error("Failed to retrieve FCM token");
    }
  } catch (error: any) {
    console.error("Failed to enable notifications:", error);
    toast.error("Failed to enable notifications. " + error.message);
    return null;
  }
};

export const onMessageListener = (callback: (payload: any) => void) => {
  if (messaging) {
    const unsubscribe = onMessage(messaging, callback);
    return unsubscribe;
  } else {
    return () => {};
  }
};
