// src/TeacherContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

// Define the Teacher interface (adjust fields as needed)
interface Teacher {
  id: string;
  name: string;
  [key: string]: any;
}

// Define the context type
interface TeacherContextType {
  teachers: Teacher[];
}

// Create the context with a default value
const TeacherContext = createContext<TeacherContextType>({ teachers: [] });

// Type for the provider props, including children
interface TeacherProviderProps {
  children: ReactNode;
}

// Provider component that subscribes to teacher data and provides it via context
export const TeacherProvider: React.FC<TeacherProviderProps> = ({
  children,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    // Build a query to fetch teachers ordered by name
    const teachersQuery = query(
      collection(db, "users"),
      where("role", "==", "teacher"),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(
      teachersQuery,
      (snapshot) => {
        const teacherData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeachers(teacherData);
      },
      (err) => console.error("Teacher snapshot error:", err)
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <TeacherContext.Provider value={{ teachers }}>
      {children}
    </TeacherContext.Provider>
  );
};

// Custom hook to use the TeacherContext
export const useTeachers = () => useContext(TeacherContext);
