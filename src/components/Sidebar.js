import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#1a1a1a] min-h-screen p-6">
      <h1 className="text-2xl font-bold text-white mb-8">Panel pracownika</h1>
      <nav>
        <ul className="space-y-4">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "block py-2 px-4 rounded bg-gray-800 text-white font-semibold"
                  : "block py-2 px-4 rounded hover:bg-gray-800 text-gray-300"
              }
            >
              Pulpit
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                isActive
                  ? "block py-2 px-4 rounded bg-gray-800 text-white font-semibold"
                  : "block py-2 px-4 rounded hover:bg-gray-800 text-gray-300"
              }
            >
              Aktywne zamówienia
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                isActive
                  ? "block py-2 px-4 rounded bg-gray-800 text-white font-semibold"
                  : "block py-2 px-4 rounded hover:bg-gray-800 text-gray-300"
              }
            >
              Historia
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/new-order"
              className={({ isActive }) =>
                isActive
                  ? "block py-2 px-4 rounded bg-gray-800 text-white font-semibold"
                  : "block py-2 px-4 rounded hover:bg-gray-800 text-gray-300"
              }
            >
              Stwórz zamówienie
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
