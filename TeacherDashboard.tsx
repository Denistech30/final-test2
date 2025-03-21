// src/TeacherDashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import { getAuth, updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
} from "firebase/firestore";
import { db, storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { BounceLoader } from "react-spinners";
import "react-toastify/dist/ReactToastify.css";

const PAGE_SIZE = 5;
const auth = getAuth();

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [isLate, setIsLate] = useState(false);
  const [name, setName] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState({
    checkIn: false,
    checkOut: false,
    upload: false,
    records: true,
  });
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const user = auth.currentUser;

  const fetchProfileData = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setName(userData.name || "No Name");
        setProfilePicture(userData.profilePicture || null);
      } else {
        console.warn("User document not found for UID:", user.uid);
        toast.warn("User profile not found. Please update your profile.");
      }
    } catch (error: any) {
      console.error("Profile fetch error:", error);
      toast.error(`Failed to load profile: ${error.message}`);
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!user) return;
    setLoading((prev) => ({ ...prev, records: true }));
    try {
      let q = showAll
        ? query(
            collection(db, "attendance"),
            where("teacherId", "==", user.uid),
            orderBy("date", "desc")
          )
        : query(
            collection(db, "attendance"),
            where("teacherId", "==", user.uid),
            orderBy("date", "desc"),
            limit(PAGE_SIZE)
          );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAttendanceRecords(records);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      const totalQuery = query(
        collection(db, "attendance"),
        where("teacherId", "==", user.uid)
      );
      const totalSnapshot = await getDocs(totalQuery);
      setTotalRecords(totalSnapshot.size);
    } catch (error: any) {
      console.error("Attendance fetch error:", error);
      toast.error(`Failed to load attendance: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, records: false }));
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfileData();
    fetchAttendanceRecords();
  }, [user, showAll, navigate]);

  const handleNextPage = async () => {
    if (!user || !lastVisible || loading.records || showAll) return;
    setLoading((prev) => ({ ...prev, records: true }));
    try {
      const nextQuery = query(
        collection(db, "attendance"),
        where("teacherId", "==", user.uid),
        orderBy("date", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQuery);
      const newRecords = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAttendanceRecords(newRecords);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setCurrentPage((prev) => prev + 1);
    } catch (error: any) {
      console.error("Next page error:", error);
      toast.error(`Failed to load next page: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, records: false }));
    }
  };

  const handlePrevPage = async () => {
    if (!user || currentPage <= 1 || loading.records || showAll) return;
    setLoading((prev) => ({ ...prev, records: true }));
    try {
      const prevQuery = query(
        collection(db, "attendance"),
        where("teacherId", "==", user.uid),
        orderBy("date", "desc"),
        limit(PAGE_SIZE * (currentPage - 1))
      );
      const snapshot = await getDocs(prevQuery);
      const records = snapshot.docs.slice(-PAGE_SIZE);
      setAttendanceRecords(records);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setCurrentPage((prev) => prev - 1);
    } catch (error: any) {
      console.error("Prev page error:", error);
      toast.error(`Failed to load previous page: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, records: false }));
    }
  };

  // Check-in allowed only between 7:00 AM and 8:00 AM.
  const isCheckInAllowed = () => {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      7,
      0
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      8,
      0
    );
    const allowed = now >= start && now < end;
    console.log(
      "Check-in allowed:",
      allowed,
      "Current time:",
      now.toLocaleTimeString()
    );
    return allowed;
  };

  // Check-out allowed only between 2:30 PM and 2:40 PM.
  const isCheckOutAllowed = () => {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      14,
      30
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      14,
      40
    );
    const allowed = now >= start && now < end;
    console.log(
      "Check-out allowed:",
      allowed,
      "Current time:",
      now.toLocaleTimeString()
    );
    return allowed;
  };

  const handleCheckIn = async () => {
    if (!user) {
      toast.error("You must be logged in to check in.");
      return;
    }
    if (loading.checkIn) return;

    setLoading((prev) => ({ ...prev, checkIn: true }));

    try {
      // Verify that the current time is within the allowed check-in window.
      if (!isCheckInAllowed()) {
        toast.error("Check-in is allowed only between 7:00 AM and 8:00 AM.");
        setLoading((prev) => ({ ...prev, checkIn: false }));
        return;
      }

      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const currentDate = now.toISOString().split("T")[0];

      // Check if already checked in today.
      const q = query(
        collection(db, "attendance"),
        where("teacherId", "==", user.uid),
        where("date", "==", currentDate)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast.error("You have already checked in today.");
        setLoading((prev) => ({ ...prev, checkIn: false }));
        return;
      }

      // Define the threshold time for lateness (8:00 AM).
      const predefinedCheckInTime = new Date(now);
      predefinedCheckInTime.setHours(8, 0, 0, 0);
      const isLateCheck = now > predefinedCheckInTime;

      // Add the check-in record.
      const docRef = await addDoc(collection(db, "attendance"), {
        teacherId: user.uid,
        date: currentDate,
        checkInTime: currentTime,
        checkOutTime: null,
        isLate: isLateCheck,
      });

      setAttendanceRecords((prev) => [
        {
          id: docRef.id,
          teacherId: user.uid,
          date: currentDate,
          checkInTime: currentTime,
          checkOutTime: null,
          isLate: isLateCheck,
        },
        ...prev.slice(0, showAll ? prev.length : PAGE_SIZE - 1),
      ]);
      setCheckInTime(currentTime);
      setIsLate(isLateCheck);
      toast.success("Checked in successfully!");
      if (!showAll) fetchAttendanceRecords();
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error(`Check-in failed: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, checkIn: false }));
    }
  };

  const handleCheckOut = async () => {
    if (!user) {
      toast.error("You must be logged in to check out.");
      return;
    }
    if (loading.checkOut) return;

    setLoading((prev) => ({ ...prev, checkOut: true }));

    try {
      // Verify that the current time is within the allowed check-out window.
      if (!isCheckOutAllowed()) {
        toast.error("Check-out is allowed only between 2:30 PM and 2:40 PM.");
        setLoading((prev) => ({ ...prev, checkOut: false }));
        return;
      }

      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const currentDate = now.toISOString().split("T")[0];

      // Find today's check-in record.
      const q = query(
        collection(db, "attendance"),
        where("teacherId", "==", user.uid),
        where("date", "==", currentDate)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast.error("You must check in before checking out.");
        setLoading((prev) => ({ ...prev, checkOut: false }));
        return;
      }

      const attendanceDoc = querySnapshot.docs[0];
      if (attendanceDoc.data().checkOutTime) {
        toast.error("You have already checked out today.");
        setLoading((prev) => ({ ...prev, checkOut: false }));
        return;
      }

      // Update the check-out time.
      await updateDoc(doc(db, "attendance", attendanceDoc.id), {
        checkOutTime: currentTime,
      });

      setAttendanceRecords((prev) =>
        prev.map((record) =>
          record.id === attendanceDoc.id
            ? { ...record, checkOutTime: currentTime }
            : record
        )
      );
      setCheckOutTime(currentTime);
      toast.success("Checked out successfully!");
      if (!showAll) fetchAttendanceRecords();
    } catch (error: any) {
      console.error("Check-out error:", error);
      toast.error(`Check-out failed: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, checkOut: false }));
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!user || !newProfilePicture || loading.upload) return;
    setLoading((prev) => ({ ...prev, upload: true }));
    try {
      const storageRef = ref(
        storage,
        `profiles/${user.uid}/${newProfilePicture.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, newProfilePicture);
      const downloadURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
      await updateDoc(doc(db, "users", user.uid), {
        profilePicture: downloadURL,
      });
      await updateProfile(user, { photoURL: downloadURL });
      setProfilePicture(downloadURL);
      toast.success("Profile picture updated successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }));
    }
    setNewProfilePicture(null);
  };

  const handleUpdateName = async () => {
    if (!user || !name.trim()) {
      toast.error("Please enter a valid name.");
      return;
    }
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      await updateProfile(user, { displayName: name.trim() });
      toast.success("Name updated successfully!");
    } catch (error: any) {
      console.error("Name update error:", error);
      toast.error(`Name update failed: ${error.message}`);
    }
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <div className="dashboard-container">
      <header className="teacher-header">
        <div className="header-right">
          <button
            onClick={() => navigate("/")}
            className="dashboard-home-btn enhanced-btn"
            aria-label="Back to Home"
          >
            <span className="btn-icon">🏠</span> Back to Home
          </button>
        </div>
      </header>

      <div className="dashboard-profile">
        {profilePicture ? (
          <img
            src={profilePicture}
            alt="Profile"
            className="dashboard-profile-img"
          />
        ) : (
          <div className="dashboard-profile-placeholder">No Image</div>
        )}
        <h1 className="dashboard-name">{name}</h1>
        <div className="dashboard-actions">
          <button
            onClick={handleCheckIn}
            className="dashboard-checkin-btn enhanced-btn"
            disabled={loading.checkIn}
            aria-label="Check In"
          >
            {loading.checkIn ? (
              <BounceLoader size={20} color="#fff" />
            ) : (
              "Check In"
            )}
          </button>
          <button
            onClick={handleCheckOut}
            className="dashboard-checkout-btn enhanced-btn"
            disabled={loading.checkOut}
            aria-label="Check Out"
          >
            {loading.checkOut ? (
              <BounceLoader size={20} color="#fff" />
            ) : (
              "Check Out"
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="dashboard-settings-btn enhanced-btn"
            aria-label="Settings"
          >
            Settings
          </button>
        </div>
      </div>

      <div className="dashboard-records">
        <h2 className="dashboard-records-title">Attendance Records</h2>
        {loading.records ? (
          <div className="loading-container centered">
            <BounceLoader color="#36d7b7" />
            <p>Loading attendance records...</p>
          </div>
        ) : attendanceRecords.length > 0 ? (
          <>
            <div className="dashboard-table-container">
              <table className="dashboard-table enhanced-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id} className="table-row-hover">
                      <td>{record.date}</td>
                      <td>{record.checkInTime}</td>
                      <td>{record.checkOutTime || "Not checked out yet"}</td>
                      <td>
                        {record.isLate ? (
                          <span className="dashboard-status-late">
                            Late Arrival
                          </span>
                        ) : (
                          <span className="dashboard-status-ontime">
                            On Time
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-controls">
              <button
                onClick={handlePrevPage}
                className="pagination-btn enhanced-btn"
                disabled={currentPage === 1 || loading.records || showAll}
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
                disabled={
                  currentPage === totalPages || loading.records || showAll
                }
                aria-label="Next Page"
              >
                Next <span className="btn-icon">→</span>
              </button>
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="pagination-btn enhanced-btn"
                aria-label={showAll ? "Show Paginated" : "Show All"}
              >
                {showAll ? "Paginate" : "Show All"}
              </button>
            </div>
          </>
        ) : (
          <p className="dashboard-no-records">No attendance records found.</p>
        )}
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div
            className="modal responsive-modal"
            ref={settingsRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSettings(false)}
              className="modal-close-btn"
              aria-label="Close Settings"
            >
              ×
            </button>
            <h2 className="modal-title">Settings</h2>
            <div className="modal-actions">
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewProfilePicture(e.target.files?.[0] || null)
                }
                className="modal-input"
                aria-label="Upload Profile Picture"
              />
              <button
                onClick={handleProfilePictureUpload}
                className="modal-btn enhanced-btn"
                disabled={loading.upload || !newProfilePicture}
                aria-label="Upload Picture"
              >
                {loading.upload ? (
                  <BounceLoader size={20} color="#fff" />
                ) : (
                  "Upload Picture"
                )}
              </button>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="modal-input"
                placeholder="Enter your name"
                aria-label="Update Name"
              />
              <button
                onClick={handleUpdateName}
                className="modal-btn enhanced-btn"
                aria-label="Update Name"
              >
                Update Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
