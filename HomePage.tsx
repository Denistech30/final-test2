import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import "./HomePage.css";
import BounceLoader from "react-spinners/BounceLoader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSun,
  faMoon,
  faRocket,
  faChalkboardTeacher,
  faBullhorn,
  faQuoteLeft,
} from "@fortawesome/free-solid-svg-icons";

interface TeamMember {
  url: string;
  caption: string;
  info: string;
}

interface Announcement {
  id: string;
  text: string;
  date: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const modalRef = useRef<HTMLDivElement>(null);
  const announcementsRef = useRef<HTMLDivElement>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamMember | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  const galleryImages: TeamMember[] = [
    {
      url: "https://i.imgur.com/iRd2YvE.jpeg",
      caption: "Mrs. Smith - Math Teacher",
      info: "Mrs. Smith has 10 years of teaching experience and loves creative math challenges.",
    },
    {
      url: "https://i.imgur.com/GJSNMcX.png",
      caption: "Mr. Jones - Head Teacher",
      info: "Mr. Jones leads our team with a passion for excellence and innovative leadership.",
    },
    {
      url: "https://i.imgur.com/BCQStae_d.jpeg?maxwidth=520&shape=thumb&fidelity=high",
      caption: "Dr. Brown - Founder",
      info: "Dr. Brown established the school with a vision of nurturing future leaders.",
    },
    {
      url: "https://i.imgur.com/a3BrOyK.jpeg",
      caption: "Ms. Taylor - Science Teacher",
      info: "Ms. Taylor inspires curiosity in science with engaging experiments.",
    },
  ];

  useEffect(() => {
    // Set theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
      document.body.classList.toggle("dark-mode", savedTheme === "dark");
    }

    // Fetch announcements with real-time updates
    setLoading(true);
    const q = query(collection(db, "announcements"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text,
          date: doc.data().date,
        }));
        setAnnouncements(
          data.length > 0
            ? data
            : [
                {
                  id: "1",
                  text: "Upcoming parent-teacher meeting on July 20.",
                  date: new Date().toISOString(),
                },
                {
                  id: "2",
                  text: "New extracurricular activities introduced this semester.",
                  date: new Date().toISOString(),
                },
                {
                  id: "3",
                  text: "Annual day scheduled for August 15.",
                  date: new Date().toISOString(),
                },
              ]
        );
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching announcements:", error);
        setAnnouncements([
          {
            id: "1",
            text: "Upcoming parent-teacher meeting on July 20.",
            date: new Date().toISOString(),
          },
          {
            id: "2",
            text: "New extracurricular activities introduced this semester.",
            date: new Date().toISOString(),
          },
          {
            id: "3",
            text: "Annual day scheduled for August 15.",
            date: new Date().toISOString(),
          },
        ]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      document.body.classList.toggle("dark-mode", newMode);
      return newMode;
    });
  };

  useEffect(() => {
    if (selectedTeam && modalRef.current) {
      modalRef.current.focus();
    }
  }, [selectedTeam]);

  useEffect(() => {
    const container = announcementsRef.current;
    if (!container) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const containerWidth = rect.width;
      const scrollSpeed = 5;

      if (mouseX < containerWidth / 2) {
        animationFrameId = requestAnimationFrame(() => {
          container.scrollLeft -= scrollSpeed;
        });
      } else {
        animationFrameId = requestAnimationFrame(() => {
          container.scrollLeft += scrollSpeed;
        });
      }
    };

    const handleMouseLeave = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [announcements]);

  return (
    <div
      className={`home-container ${isDarkMode ? "dark-mode" : "light-mode"}`}
    >
      <header className="home-header">
        <div className="home-logo">
          <img
            src="https://i.imgur.com/RZxkYwr.jpg"
            alt="School Logo"
            className="logo-img"
          />
          <span className="school-name">School Name</span>
        </div>
        <div className="home-header-right">
          <button
            className="mode-toggle enhanced-btn"
            onClick={toggleDarkMode}
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
          </button>
          {user && (
            <button
              className="profile-btn1"
              onClick={() => navigate("/dashboard")}
              aria-label={`${user.displayName || "User"}'s profile`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={`${user.displayName}'s profile`}
                  className="profile-imge"
                />
              ) : (
                <div className="profile-placeholder">
                  {user.displayName ? user.displayName.charAt(0) : "U"}
                </div>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="home-main">
        <section className="welcome-section slide-in">
          <h1 className="welcome-title">
            <FontAwesomeIcon icon={faRocket} className="welcome-icon" />{" "}
            {user
              ? `Welcome back, ${user.displayName || "User"}!`
              : "Welcome to School Name!"}
          </h1>
          <p className="welcome-text">
            Empowering education with excellence. Discover our community and
            join us in our journey of learning and innovation.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="get-started-btn enhanced-btn"
            aria-label="Get Started"
          >
            Get Started
          </button>
        </section>

        <section className="gallery-section">
          <h2 className="section-title">
            <FontAwesomeIcon
              icon={faChalkboardTeacher}
              className="section-icon"
            />{" "}
            Our Esteemed Team
          </h2>
          <div className="gallery-grid">
            {galleryImages.map((img, index) => (
              <div
                key={index}
                className="team-card animate-card"
                onClick={() => setSelectedTeam(img)}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${img.caption}`}
                onKeyPress={(e) => e.key === "Enter" && setSelectedTeam(img)}
              >
                <img src={img.url} alt={img.caption} className="team-img" />
                <div className="team-caption">{img.caption}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="announcements-section">
          <h2 className="section-title">
            <FontAwesomeIcon icon={faBullhorn} className="section-icon" />{" "}
            Announcements
          </h2>
          {loading ? (
            <div className="loading-container centered">
              <BounceLoader color="#36d7b7" />
              <p>Loading announcements...</p>
            </div>
          ) : (
            <div className="announcements-container" ref={announcementsRef}>
              <div className="announcements-cards">
                {announcements.map((ann) => (
                  <div key={ann.id} className="announcement-card glowing-card">
                    <p className="announcement-date">
                      {new Date(ann.date).toLocaleDateString()}
                    </p>
                    <p className="announcement-text">{ann.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="testimonials-section">
          <h2 className="section-title">
            <FontAwesomeIcon icon={faQuoteLeft} className="section-icon" />{" "}
            Testimonials
          </h2>
          <div className="testimonials-grid">
            <article className="testimonial-item">
              <blockquote className="testimonial-text">
                “This school transformed my life. The teachers are incredibly
                supportive.”
              </blockquote>
              <p className="testimonial-author">- Student A</p>
            </article>
            <article className="testimonial-item">
              <blockquote className="testimonial-text">
                “A nurturing environment with top-notch extracurriculars.”
              </blockquote>
              <p className="testimonial-author">- Parent B</p>
            </article>
            <article className="testimonial-item">
              <blockquote className="testimonial-text">
                “The leadership here is truly inspirational and visionary.”
              </blockquote>
              <p className="testimonial-author">- Teacher C</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-accreditations">
          <img
            src="https://via.placeholder.com/50"
            alt="Accreditation 1"
            className="footer-logo"
          />
          <img
            src="https://via.placeholder.com/50"
            alt="Accreditation 2"
            className="footer-logo"
          />
          <img
            src="https://via.placeholder.com/50"
            alt="Affiliation 1"
            className="footer-logo"
          />
        </div>
        <div className="footer-info">
          © {new Date().getFullYear()} School Name. All rights reserved.
        </div>
      </footer>

      {selectedTeam && (
        <div
          className="modal-overlay fade-in"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="team-modal"
            ref={modalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedTeam.url}
              alt={selectedTeam.caption}
              className="team-modal-img"
            />
            <h3 className="team-modal-title">{selectedTeam.caption}</h3>
            <p className="team-modal-info">{selectedTeam.info}</p>
            <button
              className="team-modal-close-btn enhanced-btn"
              onClick={() => setSelectedTeam(null)}
              aria-label="Close team member details"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
