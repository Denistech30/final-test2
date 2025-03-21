// src/HeadTeacherDashboard.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  startAfter,
  limit,
  DocumentSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { BounceLoader } from "react-spinners";
import "react-toastify/dist/ReactToastify.css";
import { ReportConfig } from "./ReportConfig";
import { useTeachers } from "./TeacherContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faMoon,
  faSun,
  faUsers,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";

const auth = getAuth();
const PAGE_SIZE = 5;
const MAX_RECORDS = 100;
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];

const attendanceReportConfig: ReportConfig = {
  columns: [
    { field: "teacherName", header: "Teacher Name" },
    {
      field: "date",
      header: "Date",
      format: (value: any) => new Date(value).toLocaleDateString(),
    },
    { field: "checkInTime", header: "Check-In" },
    {
      field: "checkOutTime",
      header: "Check-Out",
      format: (value: any) => value || "Not checked out",
    },
    {
      field: "isLate",
      header: "Late Arrival",
      format: (value: any) => (value ? "Yes" : "No"),
    },
  ],
  filters: { dateRange: true, userSelection: false },
};

interface Announcement {
  id: string;
  text: string;
  date: string;
  authorId: string;
  pinned?: boolean;
}

interface AttendanceRecord {
  id: string;
  teacherId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string | null;
  isLate: boolean;
}

interface TeacherMap {
  [key: string]: string; // Maps teacherId to teacher name
}

interface User {
  id: string;
  name: string;
  role: string;
}

const HeadTeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { teachers } = useTeachers(); // Still used elsewhere, but not for manage teachers
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>(
    []
  );
  const [teacherNames, setTeacherNames] = useState<TeacherMap>({});
  const [allUsers, setAllUsers] = useState<User[]>([]); // New state for all users in manage teachers
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showManageTeachers, setShowManageTeachers] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState({
    fetch: false,
    export: false,
    roleUpdate: false,
    announcements: true,
    users: false, // New loading state for fetching users
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    string | null
  >(null);
  const [editedText, setEditedText] = useState("");
  const analyticsModalRef = useRef<HTMLDivElement>(null);

  const user = auth.currentUser;

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("You're back online! Data will sync automatically.");
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.warn(
        "You're offline. Showing cached data; some actions are disabled."
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
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
      document.body.classList.toggle("dark-mode", savedTheme === "dark");
    }

    const fetchInitialRecords = async () => {
      setLoading((prev) => ({ ...prev, fetch: true }));
      try {
        let q = showAll
          ? query(
              collection(db, "attendance"),
              orderBy("date", "desc"),
              limit(MAX_RECORDS)
            )
          : query(
              collection(db, "attendance"),
              orderBy("date", "desc"),
              limit(PAGE_SIZE)
            );
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AttendanceRecord[];
        setAttendanceRecords(records);
        setFilteredRecords(records);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        const totalQuery = query(collection(db, "attendance"));
        const totalSnapshot = await getDocs(totalQuery);
        setTotalRecords(totalSnapshot.size);
        if (showAll && totalSnapshot.size > MAX_RECORDS) {
          toast.info(
            `Showing the first ${MAX_RECORDS} records. Use pagination for more.`
          );
        }
      } catch (error: any) {
        console.error("Error fetching attendance records:", error);
        if (isOffline) {
          toast.warn("You're offline. Showing cached attendance records.");
        } else {
          toast.error(`Failed to load records: ${error.message}`);
        }
      }
      setLoading((prev) => ({ ...prev, fetch: false }));
    };
    fetchInitialRecords();

    const announcementsQuery = query(
      collection(db, "announcements"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text,
          date: doc.data().date,
          authorId: doc.data().authorId || "",
          pinned: doc.data().pinned || false,
        }));
        setAnnouncements(data);
        setLoading((prev) => ({ ...prev, announcements: false }));
      },
      (error) => {
        console.error("Error fetching announcements:", error);
        if (isOffline) {
          toast.warn("You're offline. Showing cached announcements.");
        } else {
          toast.error(`Failed to load announcements: ${error.message}`);
        }
        setLoading((prev) => ({ ...prev, announcements: false }));
      }
    );

    // Fetch all users for manage teachers modal
    const fetchAllUsers = async () => {
      setLoading((prev) => ({ ...prev, users: true }));
      try {
        const usersQuery = query(collection(db, "users"), orderBy("name"));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unnamed User",
          role: doc.data().role || "teacher", // Default to "teacher" if no role
        })) as User[];
        setAllUsers(usersData);
        console.log("All users fetched for manage teachers:", usersData);

        // Also update teacherNames for attendance table
        const nameMap: TeacherMap = {};
        usersSnapshot.forEach((doc) => {
          nameMap[doc.id] = doc.data().name || "Unnamed Teacher";
        });
        setTeacherNames(nameMap);
      } catch (error: any) {
        console.error("Error fetching all users:", error);
        toast.error("Failed to fetch users for management.");
        // Fallback to context teachers
        const nameMap: TeacherMap = {};
        teachers.forEach((teacher) => {
          nameMap[teacher.id] = teacher.name || "Unnamed Teacher";
        });
        setTeacherNames(nameMap);
        setAllUsers(
          teachers.map((t) => ({
            id: t.id,
            name: t.name,
            role: t.role || "teacher",
          }))
        );
      }
      setLoading((prev) => ({ ...prev, users: false }));
    };
    fetchAllUsers();

    return () => unsubscribe();
  }, [showAll, teachers]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      document.body.classList.toggle("dark-mode", newMode);
      return newMode;
    });
  };

  const handleNextPage = async () => {
    if (!lastVisible || loading.fetch || showAll) return;
    setLoading((prev) => ({ ...prev, fetch: true }));
    try {
      const nextQuery = query(
        collection(db, "attendance"),
        orderBy("date", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQuery);
      const newRecords = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AttendanceRecord[];
      setAttendanceRecords(newRecords);
      setFilteredRecords(newRecords);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setCurrentPage((prev) => prev + 1);
    } catch (error: any) {
      if (isOffline) {
        toast.warn("You're offline. Pagination is limited to cached data.");
      } else {
        toast.error(`Failed to load next page: ${error.message}`);
      }
    }
    setLoading((prev) => ({ ...prev, fetch: false }));
  };

  const handlePrevPage = async () => {
    if (currentPage <= 1 || loading.fetch || showAll) return;
    setLoading((prev) => ({ ...prev, fetch: true }));
    try {
      const prevQuery = query(
        collection(db, "attendance"),
        orderBy("date", "desc"),
        limit(PAGE_SIZE * (currentPage - 1))
      );
      const snapshot = await getDocs(prevQuery);
      const records = snapshot.docs.slice(-PAGE_SIZE);
      setAttendanceRecords(records as any);
      setFilteredRecords(records as any);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setCurrentPage((prev) => prev - 1);
    } catch (error: any) {
      if (isOffline) {
        toast.warn("You're offline. Pagination is limited to cached data.");
      } else {
        toast.error(`Failed to load previous page: ${error.message}`);
      }
    }
    setLoading((prev) => ({ ...prev, fetch: false }));
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates.");
      return;
    }
    const filtered = attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return recordDate >= start && recordDate <= end;
    });
    setFilteredRecords(filtered);
    toast.success("Records filtered successfully!");
  };

  const resetFilter = () => {
    setStartDate("");
    setEndDate("");
    setFilteredRecords(attendanceRecords);
    toast.success("Filter reset!");
  };

  const getTeacherName = (teacherId: string) => {
    return teacherNames[teacherId] || "Unknown Teacher";
  };

  const exportToPDF = async () => {
    if (loading.export) return;
    if (isOffline) {
      toast.warn("You're offline. Export functionality is disabled.");
      return;
    }
    setLoading((prev) => ({ ...prev, export: true }));
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Attendance Report", 14, 22);
    const tableColumn = attendanceReportConfig.columns.map((col) => col.header);
    const tableRows = filteredRecords.map((record) =>
      attendanceReportConfig.columns.map((col) => {
        const value =
          col.field === "teacherName"
            ? getTeacherName(record.teacherId)
            : (record[col.field as keyof AttendanceRecord] as string);
        return col.format ? col.format(value) : value;
      })
    );
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });
    doc.save("attendance_report.pdf");
    toast.success("PDF report generated successfully!");
    setLoading((prev) => ({ ...prev, export: false }));
  };

  const exportToCSV = async () => {
    if (loading.export) return;
    if (isOffline) {
      toast.warn("You're offline. Export functionality is disabled.");
      return;
    }
    setLoading((prev) => ({ ...prev, export: true }));
    const csvData = filteredRecords.map((record) => {
      const row: any = {};
      attendanceReportConfig.columns.forEach((col) => {
        const value =
          col.field === "teacherName"
            ? getTeacherName(record.teacherId)
            : (record[col.field as keyof AttendanceRecord] as string);
        row[col.header] = col.format ? col.format(value) : value;
      });
      return row;
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "attendance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report generated successfully!");
    setLoading((prev) => ({ ...prev, export: false }));
  };

  const { dailyCheckInsArray, pieChartData } = useMemo(() => {
    const dailyCheckIns: Record<string, number> = {};
    let lateCheckIns = 0;
    let onTimeCheckIns = 0;
    filteredRecords.forEach((record) => {
      dailyCheckIns[record.date] = (dailyCheckIns[record.date] || 0) + 1;
      record.isLate ? lateCheckIns++ : onTimeCheckIns++;
    });
    const dailyArray = Object.keys(dailyCheckIns).map((date) => ({
      date,
      checkIns: dailyCheckIns[date],
    }));
    const pieData = [
      { name: "Late Check-Ins", value: lateCheckIns },
      { name: "On-Time Check-Ins", value: onTimeCheckIns },
    ];
    return { dailyCheckInsArray: dailyArray, pieChartData: pieData };
  }, [filteredRecords]);

  const updateUserRole = async (userId: string, newRole: string) => {
    if (loading.roleUpdate) return;
    if (isOffline) {
      toast.warn(
        "You're offline. Role updates will sync when you're back online."
      );
      return;
    }
    setLoading((prev) => ({ ...prev, roleUpdate: true }));
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { role: newRole });
      toast.success(`User role updated to ${newRole}`);
      // Update local state to reflect change immediately
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (error: any) {
      toast.error(`Failed to update role: ${error.message}`);
    }
    setLoading((prev) => ({ ...prev, roleUpdate: false }));
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    if (!user) {
      toast.error("You must be logged in to edit announcements.");
      return;
    }
    if (announcement.authorId !== user.uid) {
      toast.error("You can only edit announcements you created.");
      return;
    }
    setEditingAnnouncementId(announcement.id);
    setEditedText(announcement.text);
  };

  const handleSaveEdit = async (announcementId: string) => {
    if (!user || !editedText.trim() || loading.roleUpdate) {
      toast.error("Please log in or enter text to save.");
      return;
    }
    if (isOffline) {
      toast.warn(
        "You're offline. Announcement updates will sync when you're back online."
      );
      return;
    }
    setLoading((prev) => ({ ...prev, roleUpdate: true }));
    try {
      const announcementRef = doc(db, "announcements", announcementId);
      const announcementDoc = await getDoc(announcementRef);
      if (!announcementDoc.exists()) {
        throw new Error("Announcement does not exist.");
      }
      const announcementData = announcementDoc.data();
      if (announcementData.authorId !== user.uid) {
        throw new Error("You can only edit announcements you created.");
      }
      await updateDoc(announcementRef, {
        text: editedText.trim(),
        date: new Date().toISOString(),
      });
      toast.success("Announcement updated successfully!");
      setEditingAnnouncementId(null);
      setEditedText("");
    } catch (error: any) {
      console.error("Error updating announcement:", error);
      toast.error(`Failed to update announcement: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, roleUpdate: false }));
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!user || loading.roleUpdate) {
      toast.error("You must be logged in to delete announcements.");
      return;
    }
    if (isOffline) {
      toast.warn(
        "You're offline. Announcement deletions will sync when you're back online."
      );
      return;
    }
    setLoading((prev) => ({ ...prev, roleUpdate: true }));
    try {
      const announcementRef = doc(db, "announcements", announcementId);
      const announcementDoc = await getDoc(announcementRef);
      if (!announcementDoc.exists()) {
        throw new Error("Announcement does not exist.");
      }
      const announcementData = announcementDoc.data();
      if (announcementData.authorId !== user.uid) {
        throw new Error("You can only delete announcements you created.");
      }
      await deleteDoc(announcementRef);
      toast.success("Announcement deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast.error(`Failed to delete announcement: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, roleUpdate: false }));
    }
  };

  const handlePinAnnouncement = async (
    announcementId: string,
    currentPinnedStatus: boolean | undefined
  ) => {
    if (!user || loading.roleUpdate) {
      toast.error("You must be logged in to pin announcements.");
      return;
    }
    if (isOffline) {
      toast.warn(
        "You're offline. Pinning updates will sync when you're back online."
      );
      return;
    }
    setLoading((prev) => ({ ...prev, roleUpdate: true }));
    try {
      const announcementRef = doc(db, "announcements", announcementId);
      const announcementDoc = await getDoc(announcementRef);
      if (!announcementDoc.exists()) {
        throw new Error("Announcement does not exist.");
      }
      const announcementData = announcementDoc.data();
      if (announcementData.authorId !== user.uid) {
        throw new Error("You can only pin announcements you created.");
      }
      const newPinnedStatus = !currentPinnedStatus ?? true;
      await updateDoc(announcementRef, {
        pinned: newPinnedStatus,
      });
      toast.success(
        `Announcement ${
          currentPinnedStatus ? "unpinned" : "pinned"
        } successfully!`
      );
    } catch (error: any) {
      console.error("Error pinning/unpinning announcement:", error);
      toast.error(
        `Failed to ${currentPinnedStatus ? "unpin" : "pin"} announcement: ${
          error.message
        }`
      );
    } finally {
      setLoading((prev) => ({ ...prev, roleUpdate: false }));
    }
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <div
      className={`headteacher-container ${
        isDarkMode ? "dark-mode" : "light-mode"
      }`}
    >
      <header className="headteacher-top-header">
        <button
          onClick={toggleDarkMode}
          className="mode-toggle enhanced-btn"
          aria-label={
            isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
        >
          {isDarkMode ? (
            <FontAwesomeIcon icon={faMoon} />
          ) : (
            <FontAwesomeIcon icon={faSun} />
          )}
        </button>
        <button
          onClick={() => navigate("/home")}
          className="headteacher-home-btn enhanced-btn"
          aria-label="Back to Home"
        >
          <span className="btn-icon">
            <FontAwesomeIcon icon={faHouse} />
          </span>
          Home
        </button>
      </header>

      <div className="dashboard-profile card">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="dashboard-profile-img"
          />
        ) : (
          <div className="dashboard-profile-placeholder">No Image</div>
        )}
        <h1 className="dashboard-name">
          {user?.displayName || "Head Teacher"}
        </h1>
      </div>

      <h2 className="headteacher-main-title">Attendance Dashboard</h2>
      <div className="headteacher-manage-btn-container">
        <button
          onClick={() => setShowManageTeachers(true)}
          className="headteacher-manage-btn enhanced-btn"
          aria-label="Manage Teachers"
        >
          <span className="btn-icon">
            <FontAwesomeIcon icon={faUsers} />
          </span>{" "}
          Manage Teachers
        </button>
      </div>

      <section className="announcement-post-section">
        <h2 className="section-title">Announcements</h2>
        <div
          className="announcements-list"
          style={{ maxHeight: "300px", overflowY: "auto" }}
        >
          {loading.announcements ? (
            <div className="loading-container centered">
              <BounceLoader color="#36d7b7" />
              <p>Loading announcements{isOffline ? " (cached)" : ""}...</p>
            </div>
          ) : announcements.length > 0 ? (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className={`announcement-card glowing-card ${
                  ann.pinned ? "pinned" : ""
                }`}
              >
                {editingAnnouncementId === ann.id ? (
                  <>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="announcement-input"
                      aria-label="Edit Announcement Text"
                      rows={3}
                    />
                    <div className="announcement-actions">
                      <button
                        onClick={() => handleSaveEdit(ann.id)}
                        className="save-btn enhanced-btn"
                        disabled={
                          loading.roleUpdate || !editedText.trim() || isOffline
                        }
                        aria-label="Save Edited Announcement"
                      >
                        {loading.roleUpdate ? (
                          <BounceLoader size={20} color="#fff" />
                        ) : (
                          "Save"
                        )}
                      </button>
                      <button
                        onClick={() => setEditingAnnouncementId(null)}
                        className="cancel-btn enhanced-btn"
                        aria-label="Cancel Edit"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="announcement-date">
                      {new Date(ann.date).toLocaleDateString()}
                    </p>
                    <p className="announcement-text">{ann.text}</p>
                    <div className="announcement-actions">
                      <button
                        onClick={() => handleEditAnnouncement(ann)}
                        className="edit-btn enhanced-btn"
                        aria-label={`Edit Announcement ${ann.text}`}
                        disabled={loading.roleUpdate}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="delete-btn enhanced-btn"
                        aria-label={`Delete Announcement ${ann.text}`}
                        disabled={loading.roleUpdate || isOffline}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() =>
                          handlePinAnnouncement(ann.id, ann.pinned)
                        }
                        className="pin-btn enhanced-btn"
                        aria-label={
                          ann.pinned
                            ? `Unpin Announcement ${ann.text}`
                            : `Pin Announcement ${ann.text}`
                        }
                        disabled={loading.roleUpdate || isOffline}
                      >
                        {ann.pinned ? "Unpin" : "Pin"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="no-announcements">
              No announcements yet.
              {isOffline ? " (Offline - showing cached data)" : ""}
            </p>
          )}
        </div>
      </section>

      <div className="headteacher-records">
        <h2 className="headteacher-records-title">Attendance Records</h2>
        <div className="headteacher-filter-section">
          <div className="headteacher-date-field">
            <label htmlFor="startDate" className="headteacher-label">
              Start Date:
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="headteacher-input"
            />
          </div>
          <div className="headteacher-date-field">
            <label htmlFor="endDate" className="headteacher-label">
              End Date:
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="headteacher-input"
            />
          </div>
          <button
            onClick={handleFilter}
            className="headteacher-filter-btn enhanced-btn"
            aria-label="Filter Records"
          >
            Filter Records
          </button>
          <button
            onClick={resetFilter}
            className="headteacher-filter-btn enhanced-btn"
            aria-label="Reset Filter"
          >
            Reset Filter
          </button>
        </div>
        <div className="headteacher-export-section">
          <button
            onClick={exportToPDF}
            className="headteacher-export-btn enhanced-btn"
            disabled={loading.export || isOffline}
            aria-label="Export to PDF"
          >
            {loading.export ? (
              <BounceLoader size={20} color="#fff" />
            ) : (
              "Export to PDF"
            )}
          </button>
          <button
            onClick={exportToCSV}
            className="headteacher-export-btn enhanced-btn"
            disabled={loading.export || isOffline}
            aria-label="Export to CSV"
          >
            {loading.export ? (
              <BounceLoader size={20} color="#fff" />
            ) : (
              "Export to CSV"
            )}
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className="headteacher-export-btn enhanced-btn"
            aria-label="View Analytics"
          >
            <span className="btn-icon">
              <FontAwesomeIcon icon={faChartBar} />
            </span>{" "}
            View Analytics
          </button>
        </div>
        {loading.fetch ? (
          <div className="loading-container centered">
            <BounceLoader color="#36d7b7" />
            <p>Loading records{isOffline ? " (cached)" : ""}...</p>
          </div>
        ) : filteredRecords.length > 0 ? (
          <>
            <div
              className="headteacher-table-container"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              <table className="headteacher-table enhanced-table">
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="table-row-hover">
                      <td>{getTeacherName(record.teacherId)}</td>
                      <td>{record.date}</td>
                      <td>{record.checkInTime}</td>
                      <td>{record.checkOutTime || "Not checked out"}</td>
                      <td>{record.isLate ? "Late" : "On Time"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAll && (
              <div className="headteacher-pagination">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loading.fetch}
                  className="headteacher-pagination-btn enhanced-btn"
                  aria-label="Previous Page"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={
                    currentPage === totalPages || loading.fetch || !lastVisible
                  }
                  className="headteacher-pagination-btn enhanced-btn"
                  aria-label="Next Page"
                >
                  Next
                </button>
                <button
                  onClick={() => setShowAll(true)}
                  className="headteacher-show-all-btn enhanced-btn"
                  aria-label="Show All Records"
                >
                  Show All
                </button>
              </div>
            )}
            {showAll && (
              <button
                onClick={() => setShowAll(false)}
                className="headteacher-show-paginated-btn enhanced-btn"
                aria-label="Show Paginated Records"
              >
                Show Paginated
              </button>
            )}
          </>
        ) : (
          <p>No attendance records available{isOffline ? " (cached)" : ""}.</p>
        )}
      </div>

      {showAnalytics && (
        <div className="modal-overlay" onClick={() => setShowAnalytics(false)}>
          <div
            className="analytics-modal"
            ref={analyticsModalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAnalytics(false)}
              className="modal-close-btn"
              aria-label="Close Analytics"
            >
              ×
            </button>
            <h2>Attendance Analytics</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyCheckInsArray}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="checkIns" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showManageTeachers && (
        <div
          className="modal-overlay"
          onClick={() => setShowManageTeachers(false)}
        >
          <div
            className="manage-teachers-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Manage Teachers</h2>
              <button
                onClick={() => setShowManageTeachers(false)}
                className="modal-close-btn"
                aria-label="Close Manage Teachers"
              >
                <span>×</span>
              </button>
            </div>
            <div className="modal-search">
              <input
                type="text"
                placeholder="Search by name or ID..."
                className="search-input"
                // Add search functionality later if desired
              />
            </div>
            <div className="modal-body">
              {loading.users ? (
                <div className="loading-container">
                  <BounceLoader color="#36d7b7" size={60} />
                  <p>Loading users{isOffline ? " (cached)" : ""}...</p>
                </div>
              ) : allUsers.length > 0 ? (
                <div className="teacher-grid">
                  {allUsers.map((user) => (
                    <div key={user.id} className="teacher-card">
                      <div className="teacher-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="teacher-details">
                        <h3 className="teacher-name">{user.name}</h3>
                        <p className="teacher-id">ID: {user.id}</p>
                      </div>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          updateUserRole(user.id, e.target.value)
                        }
                        disabled={loading.roleUpdate || isOffline}
                        className="role-select"
                        aria-label={`Change role for ${user.name}`}
                      >
                        <option value="teacher">Teacher</option>
                        <option value="headTeacher">Head Teacher</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-users">
                  <p>No users available{isOffline ? " (cached)" : ""}.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowManageTeachers(false)}
                className="close-btn enhanced-btn"
                aria-label="Close Modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadTeacherDashboard;
