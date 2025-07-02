import React from "react";
import { useDaySession } from "../contexts/DaySessionContext";

export default function DaySettings() {
  const { selectedDate, resetSelectedDay, loading } = useDaySession();

  return (
    <div className="max-w-xl mx-auto mt-12 bg-gray-800 rounded-xl shadow-lg p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Ustawienia dnia</h1>
      <p className="text-gray-300 mb-8">
        Wybrana data:{" "}
        <span className="font-semibold text-white">{selectedDate}</span>
      </p>
      <button
        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-60"
        onClick={() => {
          if (window.confirm("Czy na pewno chcesz zresetować wybrany dzień?")) {
            resetSelectedDay();
          }
        }}
        disabled={loading}
      >
        {loading ? "Resetowanie..." : "Resetuj wybrany dzień"}
      </button>
      {/* Tu w przyszłości można dodać inne ustawienia dnia */}
    </div>
  );
}
