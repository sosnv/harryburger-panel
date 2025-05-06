import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { useDaySession } from "../contexts/DaySessionContext";
import { useNavigate } from "react-router-dom";

export default function WarehouseStockTile({ showSnapshots, onSnapshotClick }) {
  const { selectedDate } = useDaySession();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasEndSnapshot, setHasEndSnapshot] = useState(false);
  const navigate = useNavigate();

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
      setSnapshot(startSnap ? startSnap.snapshot : null);

      // Sprawdź czy istnieje snapshot końcowy
      const endSnap = snaps.find(
        (snap) => snap.sessionDay === selectedDate && snap.type === "end"
      );
      setHasEndSnapshot(!!endSnap);

      setLoading(false);
    }
    fetchSnapshots();
  }, [selectedDate]);

  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  if (snapshot) {
    const products = Object.values(snapshot);
    products.forEach((p) => {
      const minStock = p.minStock ?? 1;
      if (p.quantity === 0) redCount++;
      else if (p.quantity <= 2 * minStock) yellowCount++;
      else greenCount++;
    });
  }

  return (
    <div
      className="bg-[#1a1a1a] rounded-lg p-6 flex flex-col gap-4 justify-between min-h-[180px]"
      onClick={() => navigate("/warehouse")}
      title="Zobacz szczegóły stanu magazynowego"
      style={{ cursor: "pointer" }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg text-gray-400">Stan magazynowy</h3>
          {showSnapshots && (
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSnapshotClick("start");
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                Stan początkowy
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSnapshotClick("end");
                }}
                disabled={!hasEndSnapshot}
                className={`px-3 py-1 rounded text-sm ${
                  hasEndSnapshot
                    ? "bg-green-600 hover:bg-green-500 text-white"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                Stan końcowy
              </button>
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/warehouse");
          }}
          className="text-gray-400 hover:text-white"
        >
          Zobacz szczegóły
        </button>
      </div>
      {loading ? (
        <div className="text-gray-400">Ładowanie...</div>
      ) : !snapshot ? (
        <div className="text-gray-400">Brak danych dla wybranego dnia.</div>
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
