// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n"; // Ensure you have created i18n.ts with your translation resources

// Error Boundary Component to catch rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to an error reporting service (optional)
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h1>Something went wrong.</h1>
          <p>Please refresh the page or try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

// Function to register the Firebase Messaging service worker
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isHttps = window.location.protocol === "https:";

    if (!isHttps && !isLocalhost) {
      console.warn(
        "Service Worker registration skipped: HTTPS or localhost required for FCM."
      );
      toast.warn(
        "Notifications may not work as this app is not running on HTTPS."
      );
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );
      console.log("Service Worker registered successfully:", registration);
      await navigator.serviceWorker.ready;
      console.log("Service Worker is ready.");
    } catch (error: any) {
      console.error("Service Worker registration failed:", error);
      toast.error(
        "Failed to register service worker for notifications. Ensure firebase-messaging-sw.js exists in your public folder and you are running on HTTPS or localhost."
      );
    }
  } else {
    console.warn("Service Worker API not supported in this browser.");
    toast.warn("This browser does not support push notifications.");
  }
};

// Register the service worker when the app starts
registerServiceWorker();

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <App />
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
