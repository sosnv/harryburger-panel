import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { toast } from "react-hot-toast";
import WarehouseSnapshotModal from "../components/WarehouseSnapshotModal";

export default function DayControlDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [isDayEnded, setIsDayEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotType, setSnapshotType] = useState(null); // 'start' | 'end'
  const [warehouseProducts, setWarehouseProducts] = useState([]);

  // Fetch session status for selected date
  useEffect(() => {
    async function fetchSession() {
      setLoading(true);
      try {
        const sessionRef = doc(
          collection(clientDb, "dailySessions"),
          selectedDate
        );
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
        toast.error("Błąd podczas pobierania statusu dnia");
        setIsDayStarted(false);
        setIsDayEnded(false);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [selectedDate]);

  // Fetch warehouse products for modal
  const fetchWarehouseProducts = async () => {
    const snapshot = await getDocs(collection(clientDb, "warehouse"));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  // Rozpocznij dzień
  const handleStartDay = async () => {
    setLoading(true);
    try {
      // Nie ustawiaj isDayStarted tutaj!
      // Otwórz modal do wpisania stanu magazynowego
      const products = await fetchWarehouseProducts();
      setWarehouseProducts(products);
      setSnapshotType("start");
      setShowSnapshotModal(true);
    } catch (err) {
      toast.error("Błąd podczas pobierania produktów magazynowych");
    } finally {
      setLoading(false);
    }
  };

  // Zakończ dzień
  const handleEndDay = async () => {
    setLoading(true);
    try {
      const sessionRef = doc(
        collection(clientDb, "dailySessions"),
        selectedDate
      );
      await updateDoc(sessionRef, {
        isDayEnded: true,
        endedAt: serverTimestamp(),
      });
      setIsDayEnded(true);
      toast.success("Dzień zakończony!");
      // Fetch products and show modal
      const products = await fetchWarehouseProducts();
      setWarehouseProducts(products);
      setSnapshotType("end");
      setShowSnapshotModal(true);
    } catch (err) {
      toast.error("Błąd podczas kończenia dnia");
    } finally {
      setLoading(false);
    }
  };

  // Zapisz snapshot magazynu
  const handleSaveSnapshot = async (quantities) => {
    try {
      // Update warehouse quantities
      const batch = [];
      for (const [productId, quantity] of Object.entries(quantities)) {
        const productRef = doc(clientDb, "warehouse", productId);
        batch.push(
          updateDoc(productRef, {
            quantity,
            lastUpdated: serverTimestamp(),
            history: {
              type: snapshotType === "start" ? "initial" : "update",
              quantity,
              timestamp: serverTimestamp(),
            },
          })
        );
      }

      // Save snapshot to daily reports
      await setDoc(doc(collection(clientDb, "dailyWarehouseReports")), {
        sessionDay: selectedDate,
        type: snapshotType,
        snapshot: quantities,
        timestamp: serverTimestamp(),
      });

      // Ustaw isDayStarted dopiero po zatwierdzeniu snapshotu
      const sessionRef = doc(
        collection(clientDb, "dailySessions"),
        selectedDate
      );
      await setDoc(
        sessionRef,
        {
          isDayStarted: true,
          isDayEnded: false,
          startedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setIsDayStarted(true);
      setIsDayEnded(false);

      toast.success("Stan magazynowy zapisany i dzień rozpoczęty!");
      setShowSnapshotModal(false);
      setSnapshotType(null);
    } catch (err) {
      toast.error("Błąd podczas zapisywania stanu magazynowego");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#18181b] p-8">
      <div className="bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-xl flex flex-col items-center">
        <h1 className="text-3xl font-bold text-white mb-6">Cykl dnia</h1>
        <div className="mb-8 w-full flex flex-col items-center">
          <label className="text-gray-300 mb-2 text-lg">Wybierz datę:</label>
          <input
            type="date"
            className="bg-gray-700 text-white px-4 py-2 rounded-lg text-lg w-60"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="w-full space-y-4">
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-2xl py-6 rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed w-full"
            disabled={isDayStarted || isDayEnded || loading}
            onClick={handleStartDay}
          >
            Rozpocznij dzień
          </button>
          <button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-2xl py-6 rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed w-full"
            disabled={!isDayStarted || isDayEnded || loading}
            onClick={handleEndDay}
          >
            Zakończ dzień
          </button>
        </div>
        <div className="text-gray-400 mt-4 text-center">
          <p>
            Status dnia:{" "}
            {isDayEnded
              ? "Zakończony"
              : isDayStarted
              ? "W trakcie"
              : "Nierozpoczęty"}
          </p>
        </div>
      </div>
      {showSnapshotModal && (
        <WarehouseSnapshotModal
          type={snapshotType}
          products={warehouseProducts}
          onSave={handleSaveSnapshot}
          onClose={() => setShowSnapshotModal(false)}
        />
      )}
    </div>
  );
}
