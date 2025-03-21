// src/Profile.tsx
import React, { useState } from "react";
import { getAuth, updateProfile } from "firebase/auth";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Profile = () => {
  const auth = getAuth();
  const user = auth.currentUser;

  const [profilePic, setProfilePic] = useState(user?.photoURL || "");
  const [name, setName] = useState(user?.displayName || "");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const imageUrl = URL.createObjectURL(selectedFile);
      setProfilePic(imageUrl);
      setFile(selectedFile);
    }
  };

  const handleUpdateProfilePicture = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user) {
        await updateProfile(user, { photoURL: profilePic });
        await updateDoc(doc(db, "users", user.uid), {
          profilePicture: profilePic,
        });
        toast.success("Profile picture updated successfully!");
      }
    } catch (error: any) {
      console.error("Error updating profile picture:", error);
      toast.error("Failed to update profile picture.");
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user) {
        await updateProfile(user, { displayName: name });
        await updateDoc(doc(db, "users", user.uid), { name });
        toast.success("Name updated successfully!");
      }
    } catch (error: any) {
      console.error("Error updating name:", error);
      toast.error("Failed to update name.");
    }
  };

  return (
    <div className="profile-container">
      <ToastContainer />
      <h2 className="profile-title">Profile</h2>
      <div className="profile-display">
        {profilePic ? (
          <img src={profilePic} alt="Profile" className="profile-img" />
        ) : (
          <div className="profile-img-placeholder">No Image</div>
        )}
        <p className="profile-name">{name}</p>
      </div>
      <form onSubmit={handleUpdateProfilePicture} className="profile-form">
        <div className="profile-field">
          <label className="profile-label">Upload New Profile Picture:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="profile-input"
          />
        </div>
        <button type="submit" className="profile-btn">
          Update Profile Picture
        </button>
      </form>
      <form onSubmit={handleUpdateName} className="profile-form">
        <div className="profile-field">
          <label className="profile-label">Update Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="profile-input"
            placeholder="Enter your name"
          />
        </div>
        <button type="submit" className="profile-btn">
          Update Name
        </button>
      </form>
    </div>
  );
};

export default Profile;
