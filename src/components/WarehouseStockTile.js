import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { useDaySession } from "../contexts/DaySessionContext";

export default function WarehouseStockTile() {
  const { selectedDate } = useDaySession();
  const [startSnapshot, setStartSnapshot] = useState(null);
  const [endSnapshot, setEndSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSnapshot, setActiveSnapshot] = useState("start");

  useEffect(() => {
    async function fetchSnapshots() {
      setLoading(true);
      const snapQ = collection(clientDb, "dailyWarehouseReports");
      const snapDocs = await getDocs(snapQ);
      const snaps = snapDocs.docs.map((doc) => doc.data());

      // Znajdź snapshot początkowy
      const startSnap = snaps.find(
        (snap) => snap.sessionDay === selectedDate && snap.type === "start"
      );
      setStartSnapshot(startSnap ? startSnap.snapshot : null);

      // Znajdź snapshot końcowy
      const endSnap = snaps.find(
        (snap) => snap.sessionDay === selectedDate && snap.type === "end"
      );
      setEndSnapshot(endSnap ? endSnap.snapshot : null);

      setLoading(false);
    }
    fetchSnapshots();
  }, [selectedDate]);

  // Calculate counts based on active snapshot
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  const currentSnapshot =
    activeSnapshot === "start" ? startSnapshot : endSnapshot;

  if (currentSnapshot) {
    const products = Object.values(currentSnapshot);
    products.forEach((p) => {
      const minStock = p.minStock ?? 1;
      if (p.quantity === 0) redCount++;
      else if (p.quantity <= 2 * minStock) yellowCount++;
      else greenCount++;
    });
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 flex flex-col gap-4 justify-between min-h-[180px]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg text-gray-400">Stan magazynowy</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveSnapshot("start")}
              className={`px-3 py-1 rounded text-sm ${
                activeSnapshot === "start"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              Stan początkowy
            </button>
            <button
              onClick={() => setActiveSnapshot("end")}
              disabled={!endSnapshot}
              className={`px-3 py-1 rounded text-sm ${
                activeSnapshot === "end" && endSnapshot
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              Stan końcowy
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Ładowanie...</div>
      ) : !currentSnapshot ? (
        <div className="text-gray-400">
          {activeSnapshot === "start"
            ? "Brak danych początkowych dla wybranego dnia."
            : "Brak danych końcowych dla wybranego dnia."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-block w-4 h-4 rounded-full bg-green-500 border-2 border-gray-700"></span>
            <span className="text-gray-200 text-base font-medium">
              Dużo zapasu:
            </span>
            <span className="text-green-400 font-bold text-lg">
              {greenCount}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-4 h-4 rounded-full bg-yellow-400 border-2 border-gray-700"></span>
            <span className="text-gray-200 text-base font-medium">
              Resztki:
            </span>
            <span className="text-yellow-300 font-bold text-lg">
              {yellowCount}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-4 h-4 rounded-full bg-red-500 border-2 border-gray-700"></span>
            <span className="text-gray-200 text-base font-medium">Brak:</span>
            <span className="text-red-400 font-bold text-lg">{redCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
