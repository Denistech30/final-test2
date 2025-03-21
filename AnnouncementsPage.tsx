// src/AnnouncementsPage.tsx
import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { BounceLoader } from "react-spinners";
import "react-toastify/dist/ReactToastify.css";
import { requestNotificationPermission, onMessageListener } from "./fcm";

interface Announcement {
  id: string;
  text: string;
  date: string;
  pinned?: boolean;
}

const PAGE_SIZE = 5;

const AnnouncementsPage: React.FC = () => {
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<
    Announcement[]
  >([]);
  const [unpinnedAnnouncements, setUnpinnedAnnouncements] = useState<
    Announcement[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Register FCM token for the current user (teacher)
  useEffect(() => {
    const registerFCM = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const token = await requestNotificationPermission();
      if (token) {
        try {
          // Store the token in the user's document
          await setDoc(
            doc(db, "users", user.uid),
            { fcmToken: token },
            { merge: true }
          );
          console.log("FCM token stored for user:", user.uid);
        } catch (error: any) {
          console.error("Error storing FCM token:", error);
          toast.error(`Failed to store notification token: ${error.message}`);
        }
      }
    };

    registerFCM();
  }, []);

  // Listen for foreground notifications
  useEffect(() => {
    const unsubscribe = onMessageListener((payload) => {
      console.log("Foreground notification received:", payload);
      const { title, body } = payload.notification;
      toast.info(`${title}: ${body}`, {
        position: "top-right",
        autoClose: 5000,
      });
    });

    return () => unsubscribe();
  }, []);

  // Fetch total unpinned announcements count for pagination
  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const totalQuery = query(
          collection(db, "announcements"),
          orderBy("date", "desc")
        );
        const totalSnapshot = await getDocs(totalQuery);
        const unpinnedCount = totalSnapshot.docs.filter(
          (doc) => !doc.data().pinned
        ).length;
        setTotalRecords(unpinnedCount);
      } catch (error: any) {
        console.error("Error fetching total announcements:", error);
        toast.error(`Failed to fetch total announcements: ${error.message}`);
      }
    };
    fetchTotal();
  }, []);

  // Fetch announcements with pagination using onSnapshot
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "announcements"), orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text,
          date: doc.data().date,
          pinned: doc.data().pinned || false,
        }));
        const pinned = data.filter((ann) => ann.pinned);
        const unpinned = data.filter((ann) => !ann.pinned).slice(0, PAGE_SIZE);
        setPinnedAnnouncements(pinned);
        setUnpinnedAnnouncements(unpinned);
        setLastVisible(unpinned[unpinned.length - 1] || null);
        setHasMore(unpinned.length === PAGE_SIZE);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching announcements:", error);
        toast.error(`Failed to load announcements: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleNextPage = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const unpinnedQuery = query(
        collection(db, "announcements"),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(unpinnedQuery);
      const allUnpinned = snapshot.docs
        .filter((doc) => !doc.data().pinned)
        .map((doc) => ({
          id: doc.id,
          text: doc.data().text,
          date: doc.data().date,
          pinned: doc.data().pinned || false,
        }));
      const startIndex = currentPage * PAGE_SIZE;
      const newUnpinned = allUnpinned.slice(startIndex, startIndex + PAGE_SIZE);
      setUnpinnedAnnouncements(newUnpinned);
      setLastVisible(newUnpinned[newUnpinned.length - 1] || null);
      setCurrentPage((prev) => prev + 1);
      setHasMore(newUnpinned.length === PAGE_SIZE);
    } catch (error: any) {
      console.error("Error fetching next page:", error);
      toast.error(`Failed to load next page: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage <= 1 || loading) return;
    setLoading(true);
    try {
      const unpinnedQuery = query(
        collection(db, "announcements"),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(unpinnedQuery);
      const allUnpinned = snapshot.docs
        .filter((doc) => !doc.data().pinned)
        .map((doc) => ({
          id: doc.id,
          text: doc.data().text,
          date: doc.data().date,
          pinned: doc.data().pinned || false,
        }));
      const startIndex = (currentPage - 2) * PAGE_SIZE;
      const newUnpinned = allUnpinned.slice(startIndex, startIndex + PAGE_SIZE);
      setUnpinnedAnnouncements(newUnpinned);
      setLastVisible(newUnpinned[newUnpinned.length - 1] || null);
      setCurrentPage((prev) => prev - 1);
      setHasMore(true);
    } catch (error: any) {
      console.error("Error fetching previous page:", error);
      toast.error(`Failed to load previous page: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <div className="announcements-page-container">
      <h2 className="section-title">Pinned Announcements</h2>
      {loading ? (
        <div className="loading-container centered">
          <BounceLoader color="#36d7b7" />
          <p>Loading pinned announcements...</p>
        </div>
      ) : pinnedAnnouncements.length > 0 ? (
        <div className="announcements-list">
          {pinnedAnnouncements.map((ann) => (
            <div key={ann.id} className="announcement-card glowing-card pinned">
              <p className="announcement-date">
                {new Date(ann.date).toLocaleDateString()}
              </p>
              <p className="announcement-text">{ann.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-announcements">No pinned announcements.</p>
      )}

      <h2 className="section-title">All Announcements</h2>
      {loading ? (
        <div className="loading-container centered">
          <BounceLoader color="#36d7b7" />
          <p>Loading announcements...</p>
        </div>
      ) : unpinnedAnnouncements.length > 0 ? (
        <>
          <div className="announcements-list">
            {unpinnedAnnouncements.map((ann) => (
              <div key={ann.id} className="announcement-card glowing-card">
                <p className="announcement-date">
                  {new Date(ann.date).toLocaleDateString()}
                </p>
                <p className="announcement-text">{ann.text}</p>
              </div>
            ))}
          </div>
          <div className="pagination-controls">
            <button
              onClick={handlePrevPage}
              className="pagination-btn enhanced-btn"
              disabled={currentPage === 1 || loading}
              aria-label="Previous Page"
            >
              <span className="btn-icon">←</span> Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              className="pagination-btn enhanced-btn"
              disabled={!hasMore || loading}
              aria-label="Next Page"
            >
              Next <span className="btn-icon">→</span>
            </button>
          </div>
        </>
      ) : (
        <p className="no-announcements">No unpinned announcements available.</p>
      )}
    </div>
  );
};

export default AnnouncementsPage;
