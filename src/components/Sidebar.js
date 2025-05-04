import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { collection, query, onSnapshot } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { FaExclamationTriangle, FaLock } from "react-icons/fa";
import { useDaySession } from "../contexts/DaySessionContext";

export default function Sidebar() {
  const {
    selectedDate,
    setSelectedDate,
    isDayStarted,
    loading: daySessionLoading,
  } = useDaySession();

  const navLinks = [
    { to: "/", label: "Pulpit" },
    { to: "/orders", label: "Aktywne zamówienia" },
    { to: "/history", label: "Historia" },
    { to: "/new-order", label: "Stwórz zamówienie" },
    { to: "/warehouse", label: "Stan magazynowy" },
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
              const isDisabled = !isDayStarted && !isDashboard;
              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      `${
                        isDisabled
                          ? "flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 bg-gray-900 cursor-not-allowed opacity-60"
                          : "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors " +
                            (isActive
                              ? "bg-blue-700 text-white"
                              : "text-gray-300 hover:bg-gray-700")
                      }`
                    }
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={(e) => {
                      if (isDisabled) e.preventDefault();
                    }}
                  >
                    {link.icon}
                    {link.label}
                    {isDisabled && <FaLock className="ml-2" />}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Stan magazynowy w pasku bocznym */}
      <div className="mt-auto pt-8 border-t border-gray-700">
        <NavLink to="/warehouse" className="block">
          <h2 className="text-lg font-semibold text-white mb-4 hover:text-blue-400 transition-colors">
            Stan magazynowy
          </h2>
          <div className="space-y-3">
            {/* warehouseProducts.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center"
              >
                <div>
                  <p className="text-sm text-gray-300">{product.name}</p>
                  <p className="text-xs text-gray-400">
                    {product.currentStock} {product.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {product.currentStock <= product.minStock && (
                    <FaExclamationTriangle className="text-red-500" />
                  )}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      product.currentStock <= product.minStock
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                  />
                </div>
              </div>
            )) */}
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
