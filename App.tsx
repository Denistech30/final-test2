// src/App.tsx
import React, { useEffect, useState, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Sidebar from "./Sidebar";
import { TeacherProvider } from "./TeacherContext";
import { requestNotificationPermission, onMessageListener } from "./fcm";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Lazy-loaded components
const Auth = lazy(() => import("./Auth"));
const TeacherDashboard = lazy(() => import("./TeacherDashboard"));
const HeadTeacherDashboard = lazy(() => import("./HeadTeacherDashboard"));
const Profile = lazy(() => import("./Profile"));
const HomePage = lazy(() => import("./HomePage"));
const AnnouncementsPage = lazy(() => import("./AnnouncementsPage"));
const TeachersTool = lazy(() => import("./TeachersTool")); // New import

const auth = getAuth();

const DashboardLayout: React.FC<{
  userRole: "teacher" | "headTeacher" | null;
}> = ({ userRole }) => {
  console.log("DashboardLayout: Rendering with userRole:", userRole);
  return (
    <>
      <Sidebar userRole={userRole} />
      <div className="main-content">
        <Outlet />
      </div>
    </>
  );
};

interface PrivateRouteProps {
  user: User | null;
}
const PrivateRoute: React.FC<PrivateRouteProps> = ({ user }) => {
  console.log("PrivateRoute: User:", user?.uid);
  return user ? <Outlet /> : <Navigate to="/auth" replace />;
};

const Spinner: React.FC = () => (
  <div
    className="spinner-container"
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}
  >
    <div
      className="spinner"
      style={{
        width: "50px",
        height: "50px",
        border: "5px solid #ccc",
        borderTop: "5px solid #007bff",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    ></div>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"teacher" | "headTeacher" | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("You're back online! Data will sync automatically.");
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.warn(
        "You're offline. Some features may be limited, but you can view cached data."
      );
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    console.log("App: Initializing auth listener...");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("App: Auth state changed, currentUser:", currentUser?.uid);
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const role = userDoc.data().role as "teacher" | "headTeacher";
            console.log("App: User role fetched:", role);
            setUserRole(
              role === "teacher" || role === "headTeacher" ? role : null
            );
          } else {
            console.log("App: No user document found, setting role to null");
            setUserRole(null);
          }

          const token = await requestNotificationPermission();
          if (token) {
            await setDoc(
              doc(db, "users", currentUser.uid),
              { fcmToken: token },
              { merge: true }
            );
            console.log("App: FCM token set:", token);
          }
        } catch (error) {
          console.error("App: Error fetching user data:", error);
          toast.error(
            "Failed to load user data. Using cached data if available."
          );
          setUserRole(null);
        }
      } else {
        console.log("App: No user authenticated");
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
      console.log(
        "App: Loading set to false, user:",
        currentUser?.uid,
        "role:",
        userRole
      );
    });

    return () => {
      console.log("App: Cleaning up auth listener...");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    onMessageListener((payload) => {
      toast.info(`${payload.notification.title}: ${payload.notification.body}`);
    });
  }, []);

  if (loading) {
    console.log("App: Rendering Spinner due to loading state...");
    return <Spinner />;
  }

  console.log("App: Rendering routes, user:", user?.uid, "role:", userRole);
  return (
    <Router>
      <div className="app-container">
        {isOffline && (
          <div
            className="offline-banner"
            style={{
              padding: "10px",
              backgroundColor: "#ffcc00",
              color: "#333",
              textAlign: "center",
              position: "sticky",
              top: 0,
              zIndex: 1000,
            }}
          >
            <strong>Offline Mode:</strong> Some features are limited. Cached
            data is available for viewing. Actions will sync when you're back
            online.
          </div>
        )}
        <Suspense fallback={<Spinner />}>
          <TeacherProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<PrivateRoute user={user} />}>
                <Route path="/home" element={<HomePage />} />
                <Route element={<DashboardLayout userRole={userRole} />}>
                  <Route
                    path="/dashboard"
                    element={
                      userRole === "teacher" ? (
                        <TeacherDashboard />
                      ) : userRole === "headTeacher" ? (
                        <HeadTeacherDashboard />
                      ) : (
                        <Navigate to="/home" replace />
                      )
                    }
                  />
                  <Route path="/profile" element={<Profile />} />
                  <Route
                    path="/announcements"
                    element={<AnnouncementsPage />}
                  />
                  <Route
                    path="/dashboard/grade-manager"
                    element={
                      userRole === "teacher" ? (
                        <TeachersTool />
                      ) : (
                        <Navigate to="/dashboard" replace />
                      )
                    }
                  />
                </Route>
                <Route path="*" element={<Navigate replace to="/home" />} />
              </Route>
            </Routes>
          </TeacherProvider>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
