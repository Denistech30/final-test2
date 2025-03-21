import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";
import { BounceLoader } from "react-spinners";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next"; // Correct import
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faUser,
  faBullhorn,
  faUsers,
  faFileAlt,
  faPlusCircle,
  faBell,
  faSignOutAlt,
  faBars,
  faChevronLeft,
  faChevronRight,
  faCalculator,
} from "@fortawesome/free-solid-svg-icons";

const auth = getAuth();

interface SidebarProps {
  userRole: "teacher" | "headTeacher" | null;
}

interface SidebarItem {
  path?: string;
  label: string;
  icon: JSX.Element;
  allowedRoles: string[];
  onClick?: () => void;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    path: "/dashboard",
    label: "dashboard",
    icon: <FontAwesomeIcon icon={faTachometerAlt} />,
    allowedRoles: ["teacher", "headTeacher"],
  },
  {
    path: "/profile",
    label: "profile",
    icon: <FontAwesomeIcon icon={faUser} />,
    allowedRoles: ["teacher", "headTeacher"],
  },
  {
    path: "/announcements",
    label: "announcements",
    icon: <FontAwesomeIcon icon={faBullhorn} />,
    allowedRoles: ["teacher", "headTeacher"],
  },
  {
    path: "/manage-teachers",
    label: "manageTeachers",
    icon: <FontAwesomeIcon icon={faUsers} />,
    allowedRoles: ["headTeacher"],
  },
  {
    path: "/reports",
    label: "generateReports",
    icon: <FontAwesomeIcon icon={faFileAlt} />,
    allowedRoles: ["headTeacher"],
  },
  {
    label: "postAnnouncement",
    icon: <FontAwesomeIcon icon={faPlusCircle} />,
    allowedRoles: ["headTeacher"],
    onClick: () => {},
  },
  {
    path: "/dashboard/grade-manager",
    label: "gradeManager",
    icon: <FontAwesomeIcon icon={faCalculator} />,
    allowedRoles: ["teacher"],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const { t, i18n } = useTranslation(); // No type assertion needed
  const role = userRole || "teacher";
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");

  const user = auth.currentUser;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    localStorage.setItem("language", lang);
    toast.success(
      `Language changed to ${lang === "en" ? "English" : "Français"}`
    );
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || t("untitled"),
          body: doc.data().body || "",
          createdAt: doc.data().createdAt || new Date().toISOString(),
          read: doc.data().read || false,
          type: doc.data().type || "",
        })) as Notification[];
        setNotifications(notifs);
        const unread = notifs.filter((notif) => !notif.read).length;
        setUnreadCount(unread);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        toast.error(t("failedToLoadNotifications"));
      }
    );
    return () => unsubscribe();
  }, [user, t]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    setIsMobile(mediaQuery.matches);
    setIsOpen(!mediaQuery.matches);
    const handleResize = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setIsOpen(!e.matches);
    };
    mediaQuery.addEventListener("change", handleResize);
    return () => {
      mediaQuery.removeEventListener("change", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMobile &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobile && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobile, isOpen]);

  const toggleSidebar = () => {
    console.log("Toggling sidebar, current state:", isOpen);
    setIsOpen((prev) => !prev);
  };

  const handlePostAnnouncement = async () => {
    if (!user || !announcementText.trim() || loading) {
      toast.error(t("pleaseLogInOrEnterAnnouncement"));
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "announcements"), {
        text: announcementText.trim(),
        date: new Date().toISOString(),
        authorId: user.uid,
      });
      toast.success(t("announcementPostedSuccessfully"));
      setAnnouncementText("");
      setShowPostModal(false);
    } catch (error: any) {
      console.error("Post error:", error);
      toast.error(`${t("failedToPostAnnouncement")}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await updateDoc(
        doc(db, "users", user.uid, "notifications", notificationId),
        { read: true }
      );
      toast.success(t("notificationMarkedAsRead"));
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      toast.error(t("failedToMarkNotification"));
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        const notifRef = doc(db, "users", user.uid, "notifications", notif.id);
        batch.delete(notifRef);
      });
      await batch.commit();
      toast.success(t("allNotificationsCleared"));
    } catch (error: any) {
      console.error("Error clearing notifications:", error);
      toast.error(t("failedToClearNotifications"));
    }
  };

  const renderNavItem = (item: SidebarItem) => (
    <li key={item.path || item.label} role="none">
      {item.path ? (
        <NavLink
          to={item.path}
          role="menuitem"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
          aria-label={t(item.label)}
        >
          <span className="sidebar-icon">{item.icon}</span>
          {isOpen && <span className="sidebar-label">{t(item.label)}</span>}
        </NavLink>
      ) : (
        <button
          onClick={() => {
            if (item.label === "postAnnouncement") {
              console.log("Opening Post Announcement modal");
              setShowPostModal(true);
            }
          }}
          role="menuitem"
          className="sidebar-link"
          aria-label={t(item.label)}
        >
          <span className="sidebar-icon">{item.icon}</span>
          {isOpen && <span className="sidebar-label">{t(item.label)}</span>}
        </button>
      )}
    </li>
  );

  return (
    <>
      {isMobile && (
        <button
          className="hamburger-btn"
          onClick={toggleSidebar}
          aria-label={isOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={isOpen}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      )}
      <div
        className={`sidebar ${isOpen ? "open" : "closed"} ${
          isMobile ? "mobile-sidebar" : ""
        }`}
        ref={sidebarRef}
      >
        {!isMobile && (
          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={isOpen ? t("collapseSidebar") : t("expandSidebar")}
          >
            {isOpen ? (
              <FontAwesomeIcon icon={faChevronLeft} />
            ) : (
              <FontAwesomeIcon icon={faChevronRight} />
            )}
          </button>
        )}
        <div className="sidebar-content">
          {isOpen && (
            <h2 className="sidebar-title">{t("teacherAttendance")}</h2>
          )}
          <nav aria-label="Main navigation">
            <ul role="menu" className="sidebar-list">
              {user && (
                <li className="notification-bell">
                  <button
                    onClick={() => setShowNotificationsModal(true)}
                    className="sidebar-link"
                    aria-label={`${t("notifications")} (${unreadCount} ${t(
                      "unread"
                    )})`}
                  >
                    <span className="sidebar-icon">
                      <FontAwesomeIcon icon={faBell} />
                      {unreadCount > 0 && (
                        <span className="notification-badge">
                          {unreadCount}
                        </span>
                      )}
                    </span>
                    {isOpen && (
                      <span className="sidebar-label">
                        {t("notifications")}
                      </span>
                    )}
                  </button>
                </li>
              )}
              {SIDEBAR_ITEMS.filter((item) =>
                item.allowedRoles.includes(role)
              ).map(renderNavItem)}
              <li role="none">
                <button
                  onClick={() => auth.signOut()}
                  className="sidebar-logout"
                  role="menuitem"
                  aria-label={t("logout")}
                >
                  <span className="sidebar-icon">
                    <FontAwesomeIcon icon={faSignOutAlt} />
                  </span>
                  {isOpen && t("logout")}
                </button>
              </li>
            </ul>
          </nav>
          {isOpen && (
            <div
              className="sidebar-language-options"
              style={{ marginTop: "20px" }}
            >
              <span className="sidebar-label" style={{ marginRight: "10px" }}>
                {t("language")}:
              </span>
              <button
                className={`language-btn ${language === "en" ? "active" : ""}`}
                onClick={() => handleLanguageChange("en")}
                style={{ marginRight: "5px" }}
              >
                English
              </button>
              <button
                className={`language-btn ${language === "fr" ? "active" : ""}`}
                onClick={() => handleLanguageChange("fr")}
              >
                Français
              </button>
            </div>
          )}
        </div>
      </div>
      {isMobile && isOpen && (
        <div className="mobile-sidebar-overlay" onClick={toggleSidebar} />
      )}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div
            className="modal responsive-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPostModal(false)}
              className="modal-close-btn"
              aria-label={t("closePostModal")}
            >
              ×
            </button>
            <h2 className="modal-title">{t("postAnnouncement")}</h2>
            <div className="modal-content">
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder={t("writeAnnouncement")}
                className="announcement-input"
                aria-label={t("announcementText")}
                rows={4}
              />
              <button
                onClick={handlePostAnnouncement}
                className="post-btn enhanced-btn"
                disabled={loading || !announcementText.trim()}
                aria-label={t("postAnnouncement")}
              >
                {loading ? <BounceLoader size={20} color="#fff" /> : t("post")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showNotificationsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowNotificationsModal(false)}
        >
          <div
            className="modal responsive-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowNotificationsModal(false)}
              className="modal-close-btn"
              aria-label={t("closeNotificationsModal")}
            >
              ×
            </button>
            <h2 className="modal-title">{t("notifications")}</h2>
            <div className="modal-content">
              {notifications.length > 0 ? (
                <>
                  <button
                    onClick={handleClearAll}
                    className="clear-all-btn enhanced-btn"
                    style={{ alignSelf: "flex-end", marginBottom: "10px" }}
                    aria-label={t("clearAllNotifications")}
                  >
                    {t("clearAll")}
                  </button>
                  <div className="notifications-list">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`notification-item ${
                          notif.read ? "read" : "unread"
                        }`}
                      >
                        <div className="notification-content">
                          <h3>{notif.title}</h3>
                          <p>{notif.body}</p>
                          <small>
                            {new Date(notif.createdAt).toLocaleString()}
                          </small>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="mark-read-btn enhanced-btn"
                            aria-label={t("markAsRead")}
                          >
                            {t("markAsRead")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>{t("noNotifications")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
