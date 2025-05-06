import React, { createContext, useContext, useState, useEffect } from "react";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
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

  // Reset wybranego dnia
  const resetSelectedDay = async () => {
    setLoading(true);
    try {
      // Usuń sesję dnia
      await deleteDoc(doc(clientDb, "dailySessions", selectedDate));
      // Usuń snapshoty magazynowe
      const snapQ = await getDocs(
        collection(clientDb, "dailyWarehouseReports")
      );
      const batch = writeBatch(clientDb);
      snapQ.docs.forEach((d) => {
        if (d.data().sessionDay === selectedDate) batch.delete(d.ref);
      });
      // Usuń zamówienia z tego dnia
      const ordersQ = await getDocs(collection(clientDb, "orders"));
      ordersQ.docs.forEach((d) => {
        const data = d.data();
        if (
          data.timestamp &&
          data.timestamp.toDate().toISOString().split("T")[0] === selectedDate
        ) {
          batch.delete(d.ref);
        }
      });
      await batch.commit();
      await refreshSessionStatus();
      alert("Dzień został zresetowany. Możesz ponownie rozpocząć dzień.");
    } catch (err) {
      alert("Błąd podczas resetowania dnia: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DaySessionContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        isDayStarted,
        isDayEnded,
        loading,
        refreshSessionStatus,
        resetSelectedDay,
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
