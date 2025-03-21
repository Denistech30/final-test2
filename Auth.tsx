// src/Auth.tsx
import React, { useState } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import "./Auth.css";

const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPasswordStrength = (password: string): string => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&#]/.test(password)) score++;
  if (score <= 2) return "Weak";
  else if (score === 3 || score === 4) return "Fair";
  else return "Strong";
};

const Auth: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Removed the useEffect for navigation; we'll handle it in the auth functions

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      toast.error("Please enter your name.");
      setLoading(false);
      return;
    }

    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    const trimmedPassword = password.trim();
    if (!passwordRegex.test(trimmedPassword)) {
      const errMsg =
        "Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&#).";
      setError(errMsg);
      toast.error(errMsg);
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        name,
        email: user.email,
        role: "teacher",
      });
      toast.success("User registered successfully!");

      // Wait for auth state to update before navigating
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          navigate("/dashboard");
          unsubscribe(); // Clean up listener
        }
      });
    } catch (error: any) {
      console.error("Sign-up error:", error.code, error.message);
      let errMsg = error.message;
      if (error.code === "auth/email-already-in-use") {
        errMsg = "Email already in use. Try logging in.";
      } else if (error.code === "auth/invalid-email") {
        errMsg = "Invalid email format.";
      }
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    const trimmedPassword = password.trim();

    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      toast.success("Logged in successfully!");

      // Wait for auth state to update before navigating
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          navigate("/dashboard");
          unsubscribe(); // Clean up listener
        }
      });
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      let errMsg = "Invalid email or password.";
      if (error.code === "auth/user-not-found") {
        errMsg = "No user found with this email.";
      } else if (error.code === "auth/wrong-password") {
        errMsg = "Incorrect password.";
      } else if (error.code === "auth/too-many-requests") {
        errMsg = "Too many attempts. Try again later.";
      }
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Please enter your email to reset the password.");
      toast.error("Please enter your email to reset the password.");
      return;
    }
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      toast.success("If the email exists, a reset link has been sent!");
    } catch (error: any) {
      console.error("Password reset error:", error.code, error.message);
      const errMsg = "Failed to send password reset email.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: user.displayName || "Google User",
          email: user.email,
          role: "teacher",
        },
        { merge: true }
      );
      toast.success("Logged in with Google successfully!");

      // Wait for auth state to update before navigating
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          navigate("/dashboard");
          unsubscribe(); // Clean up listener
        }
      });
    } catch (error: any) {
      console.error("Google Sign-In error:", error.code, error.message);
      let errMsg = "Failed to sign in with Google.";
      switch (error.code) {
        case "auth/popup-closed-by-user":
          errMsg = "Sign-in popup was closed. Please try again.";
          break;
        case "auth/popup-blocked":
          errMsg = "Popup was blocked by your browser. Please allow popups.";
          break;
        case "auth/account-exists-with-different-credential":
          errMsg = "Account exists with a different sign-in method.";
          break;
        default:
          errMsg = error.message;
      }
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthProgress = (strength: string) => {
    if (strength === "Weak") return 33;
    if (strength === "Fair") return 66;
    if (strength === "Strong") return 100;
    return 0;
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "Weak":
        return "#f44336"; // Red
      case "Fair":
        return "#ff9800"; // Orange
      case "Strong":
        return "#4caf50"; // Green
      default:
        return "#e0e0e0"; // Gray (neutral)
    }
  };

  const strengthColor = getStrengthColor(passwordStrength);
  const strengthProgress = getStrengthProgress(passwordStrength);

  return (
    <div className="auth-container" role="main" aria-labelledby="auth-title">
      <ToastContainer />
      <h2 id="auth-title" className="auth-title">
        {isRegistering ? "Register" : "Login"}
      </h2>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={isRegistering ? handleSignUp : handleLogin}
        className="auth-form"
        noValidate
      >
        {isRegistering && (
          <div className="auth-field">
            <label htmlFor="name-input" className="auth-label">
              Name
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="auth-input"
              placeholder="Enter your name"
              required
              disabled={loading}
              aria-required="true"
              aria-describedby="name-error"
            />
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="email-input" className="auth-label">
            Email
          </label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="auth-input"
            placeholder="Enter your email"
            required
            disabled={loading}
            aria-required="true"
            aria-describedby="email-error"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password-input" className="auth-label">
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordStrength(getPasswordStrength(e.target.value));
              }}
              className="auth-input"
              placeholder="Enter your password"
              required
              disabled={loading}
              aria-required="true"
              aria-describedby="password-strength"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="toggle-password-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {isRegistering && password && (
            <>
              <p
                className="password-strength"
                id="password-strength"
                style={{
                  color: strengthColor,
                  marginTop: "4px",
                  fontSize: "0.9rem",
                }}
              >
                Password Strength: {passwordStrength}
              </p>
              <div
                className="password-progress-wrapper"
                role="progressbar"
                aria-valuenow={strengthProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Password strength: ${passwordStrength}`}
              >
                <div
                  className="password-progress-fill"
                  style={{
                    width: `${strengthProgress}%`,
                    backgroundColor: strengthColor,
                    transition: "width 0.3s ease, background-color 0.3s ease",
                  }}
                />
              </div>
              <small
                className="password-requirements"
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: "var(--secondary-text-color)",
                }}
              >
                Password must be at least 8 characters, with an uppercase,
                lowercase, number, and special character (@$!%*?&#).
              </small>
            </>
          )}
        </div>
        <button
          type="submit"
          className="auth-button"
          disabled={loading}
          aria-label={isRegistering ? "Sign Up" : "Login"}
        >
          {loading ? "Processing..." : isRegistering ? "Sign Up" : "Login"}
        </button>
      </form>
      {!isRegistering && (
        <p className="auth-forgot">
          <button
            onClick={handlePasswordReset}
            className="auth-link"
            disabled={loading}
            aria-label="Forgot Password"
          >
            Forgot Password?
          </button>
        </p>
      )}
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <button
          onClick={handleGoogleSignIn}
          className="auth-button google-button"
          style={{ background: "#4285f4", marginTop: "10px" }}
          disabled={loading}
          aria-label={
            isRegistering ? "Sign Up with Google" : "Sign In with Google"
          }
        >
          <FaGoogle style={{ marginRight: "8px" }} />
          Sign {isRegistering ? "Up" : "In"} with Google
        </button>
      </div>
      <button
        onClick={() => {
          setIsRegistering(!isRegistering);
          setError(null);
        }}
        className="auth-toggle"
        disabled={loading}
        aria-label={isRegistering ? "Switch to Login" : "Switch to Register"}
      >
        {isRegistering
          ? "Already have an account? Login"
          : "Need an account? Register"}
      </button>
    </div>
  );
};

export default Auth;
