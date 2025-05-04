import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";

const DaySessionContext = createContext();

export function DaySessionProvider({ children }) {
  const getToday = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };
  const [selectedDate, setSelectedDate] = useState(() => {
    return localStorage.getItem("selectedDate") || getToday();
  });
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [isDayEnded, setIsDayEnded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Persist date in localStorage
  useEffect(() => {
    localStorage.setItem("selectedDate", selectedDate);
  }, [selectedDate]);

  // Fetch session status from Firestore
  const refreshSessionStatus = async (date = selectedDate) => {
    setLoading(true);
    try {
      const sessionRef = doc(clientDb, "dailySessions", date);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        setIsDayStarted(!!data.isDayStarted);
        setIsDayEnded(!!data.isDayEnded);
      } else {
        setIsDayStarted(false);
        setIsDayEnded(false);
      }
    } catch (err) {
      setIsDayStarted(false);
      setIsDayEnded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSessionStatus();
    // eslint-disable-next-line
  }, [selectedDate]);

  return (
    <DaySessionContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        isDayStarted,
        isDayEnded,
        loading,
        refreshSessionStatus,
      }}
    >
      {children}
    </DaySessionContext.Provider>
  );
}

export function useDaySession() {
  const ctx = useContext(DaySessionContext);
  if (!ctx)
    throw new Error("useDaySession must be used within DaySessionProvider");
  return ctx;
}
