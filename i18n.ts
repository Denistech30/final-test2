// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Define your translation resources
const resources = {
  en: {
    translation: {
      dashboard: "Dashboard",
      profile: "Profile",
      notifications: "Notifications",
      logout: "Logout",
      language: "Language",
      closeMenu: "Close Menu",
      openMenu: "Open Menu",
      collapseSidebar: "Collapse Sidebar",
      expandSidebar: "Expand Sidebar",
      teacherAttendance: "Teacher Attendance",
      untitled: "Untitled",
      failedToLoadNotifications: "Failed to load notifications",
      pleaseLogInOrEnterAnnouncement:
        "Please log in or enter announcement text.",
      announcementPostedSuccessfully: "Announcement posted successfully!",
      failedToPostAnnouncement: "Failed to post announcement",
      notificationMarkedAsRead: "Notification marked as read",
      failedToMarkNotification: "Failed to mark notification as read",
      allNotificationsCleared: "All notifications cleared",
      failedToClearNotifications: "Failed to clear notifications",
      closePostModal: "Close Post Modal",
      postAnnouncement: "Post Announcement",
      writeAnnouncement: "Write your announcement here...",
      announcementText: "Announcement Text",
      post: "Post",
      closeNotificationsModal: "Close Notifications Modal",
      clearAllNotifications: "Clear All Notifications",
      clearAll: "Clear All",
      markAsRead: "Mark as Read",
      noNotifications: "No notifications available",
      // ... Head teacher Dashboard
      switchToLight: "Passer au mode clair",
      switchToDark: "Passer au mode sombre",
      home: "Accueil",
      // ... add other keys as needed
    },
  },
  fr: {
    translation: {
      dashboard: "Tableau de bord",
      profile: "Profil",
      notifications: "Notifications",
      logout: "Déconnexion",
      language: "Langue",
      closeMenu: "Fermer le menu",
      openMenu: "Ouvrir le menu",
      collapseSidebar: "Réduire la barre latérale",
      expandSidebar: "Agrandir la barre latérale",
      teacherAttendance: "Présence des enseignants",
      untitled: "Sans titre",
      failedToLoadNotifications: "Échec du chargement des notifications",
      pleaseLogInOrEnterAnnouncement:
        "Veuillez vous connecter ou saisir le texte de l'annonce.",
      announcementPostedSuccessfully: "Annonce publiée avec succès !",
      failedToPostAnnouncement: "Échec de la publication de l'annonce",
      notificationMarkedAsRead: "Notification marquée comme lue",
      failedToMarkNotification: "Échec du marquage de la notification",
      allNotificationsCleared: "Toutes les notifications ont été supprimées",
      failedToClearNotifications: "Échec de la suppression des notifications",
      closePostModal: "Fermer la fenêtre d'annonce",
      postAnnouncement: "Publier l'annonce",
      writeAnnouncement: "Écrivez votre annonce ici...",
      announcementText: "Texte de l'annonce",
      post: "Publier",
      closeNotificationsModal: "Fermer les notifications",
      clearAllNotifications: "Tout effacer",
      clearAll: "Tout effacer",
      markAsRead: "Marquer comme lue",
      noNotifications: "Aucune notification disponible",
      manageTeachers: "Gérer les enseignants",
      generateReports: "Générer des rapports",
      // ... Head teacher Dashboard
      switchToLight: "Passer au mode clair",
      switchToDark: "Passer au mode sombre",
      home: "Accueil",
      // ... add other keys as needed
    },
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
