import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { collection, query, onSnapshot, getDocs } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { FaExclamationTriangle, FaLock } from "react-icons/fa";
import { useDaySession } from "../contexts/DaySessionContext";

export default function Sidebar() {
  const {
    selectedDate,
    setSelectedDate,
    isDayStarted,
    loading: daySessionLoading,
    resetSelectedDay,
    isDayEnded,
  } = useDaySession();

  // Stan magazynowy z dailyWarehouseReports
  const [snapshot, setSnapshot] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activeOrders, setActiveOrders] = useState(0);
  const [archivedOrders, setArchivedOrders] = useState(0);

  React.useEffect(() => {
    async function fetchSnapshot() {
      setLoading(true);
      const snapQ = collection(clientDb, "dailyWarehouseReports");
      const snapDocs = await getDocs(snapQ);
      const found = snapDocs.docs
        .map((doc) => doc.data())
        .find(
          (snap) => snap.sessionDay === selectedDate && snap.type === "start"
        );
      setSnapshot(found ? found.snapshot : null);
      setLoading(false);
    }
    fetchSnapshot();
  }, [selectedDate]);

  useEffect(() => {
    const unsub = onSnapshot(collection(clientDb, "orders"), (snapshot) => {
      let active = 0;
      let archived = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        // Sprawdź czy zamówienie jest z wybranego dnia
        const isFromSelectedDay =
          data.sessionDay === selectedDate ||
          (!data.sessionDay &&
            data.timestamp &&
            data.timestamp.toDate().toISOString().split("T")[0] ===
              selectedDate);

        if (isFromSelectedDay) {
          if (!data.isArchived) {
            active++;
          } else {
            archived++;
          }
        }
      });
      setActiveOrders(active);
      setArchivedOrders(archived);
    });
    return () => unsub();
  }, [selectedDate]);

  const navLinks = [
    { to: "/", label: "Pulpit" },
    { to: "/orders", label: "Aktywne zamówienia", blockedWhenDayEnded: true },
    { to: "/history", label: "Historia", blockedWhenDayEnded: false },
    { to: "/new-order", label: "Stwórz zamówienie", blockedWhenDayEnded: true },
    {
      to: "/employee-consumption",
      label: "Zużycie własne",
      blockedWhenDayEnded: true,
    },
    { to: "/warehouse", label: "Stan magazynowy", blockedWhenDayEnded: false },
    {
      to: "/day-settings",
      label: "Ustawienia dnia",
      blockedWhenDayEnded: false,
    },
  ];

  return (
    <aside className="w-64 bg-[#1a1a1a] min-h-screen p-6 flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Panel pracownika</h1>
        <div className="mb-6">
          <label className="text-gray-400 text-sm block mb-1">
            Data pracy:
          </label>
          <input
            type="date"
            className="bg-gray-700 text-white px-3 py-2 rounded w-full"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={daySessionLoading}
          />
        </div>
        <nav>
          <ul className="space-y-4">
            {navLinks.map((link, idx) => {
              const isDashboard = link.to === "/";
              const isDisabled =
                (!isDayStarted && !isDashboard) ||
                (isDayEnded && link.blockedWhenDayEnded);
              // Badge logic
              let badge = null;
              if (link.to === "/orders" && activeOrders > 0) {
                badge = (
                  <span
                    className="ml-2 flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white font-bold"
                    style={{
                      minWidth: "18px",
                      minHeight: "18px",
                      fontSize: "0.85rem",
                      lineHeight: "1",
                      padding: 0,
                    }}
                  >
                    {activeOrders}
                  </span>
                );
              }
              if (link.to === "/history" && archivedOrders > 0) {
                badge = (
                  <span
                    className="ml-2 flex items-center justify-center w-4 h-4 rounded-full bg-gray-500 text-white font-bold"
                    style={{
                      minWidth: "18px",
                      minHeight: "18px",
                      fontSize: "0.85rem",
                      lineHeight: "1",
                      padding: 0,
                    }}
                  >
                    {archivedOrders}
                  </span>
                );
              }
              return (
                <li key={link.to} className="relative">
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 rounded-lg transition-colors relative ${
                        isDisabled
                          ? "text-gray-500 bg-gray-900 cursor-not-allowed opacity-60"
                          : isActive
                          ? "bg-blue-700 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`
                    }
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={(e) => {
                      if (isDisabled) e.preventDefault();
                    }}
                  >
                    <span className="flex-1 flex items-center">
                      {link.label}
                      {badge}
                    </span>
                    {isDisabled && (
                      <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-lg" />
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Stan magazynowy w pasku bocznym */}
      {/* Usunięto sekcję stanu magazynowego z paska bocznego na życzenie */}
    </aside>
  );
}
