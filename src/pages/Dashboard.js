import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import WarehouseStockTile from "../components/WarehouseStockTile";
import { useDaySession } from "../contexts/DaySessionContext";
import WarehouseSnapshotModal from "../components/WarehouseSnapshotModal";
import { toast } from "react-hot-toast";

export default function Dashboard() {
  const [aktywnych, setAktywnych] = useState(0);
  const [zakonczonych, setZakonczonych] = useState(0);
  const {
    isDayStarted,
    loading: daySessionLoading,
    selectedDate,
    refreshSessionStatus,
  } = useDaySession();
  const [loading, setLoading] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [warehouseProducts, setWarehouseProducts] = useState([]);

  useEffect(() => {
    const ordersRef = collection(clientDb, "orders");
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data());
      const activeCount = docs.filter((d) => !d.isArchived).length;
      const completedCount = docs.filter((d) => d.isArchived).length;
      setAktywnych(activeCount);
      setZakonczonych(completedCount);
    });
    return () => unsubscribe();
  }, []);

  // Rozpocznij dzień i otwórz modal snapshotu
  const handleStartDay = async () => {
    setLoading(true);
    try {
      const sessionRef = doc(
        collection(clientDb, "dailySessions"),
        selectedDate
      );
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        await updateDoc(sessionRef, {
          isDayStarted: true,
          isDayEnded: false,
          startedAt: serverTimestamp(),
        });
      } else {
        await setDoc(sessionRef, {
          isDayStarted: true,
          isDayEnded: false,
          startedAt: serverTimestamp(),
        });
      }
      toast.success("Dzień rozpoczęty!");
      // Pobierz produkty i pokaż modal
      const snapshot = await getDocs(collection(clientDb, "warehouse"));
      setWarehouseProducts(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setShowSnapshotModal(true);
    } catch (err) {
      toast.error("Błąd podczas rozpoczynania dnia");
    } finally {
      setLoading(false);
    }
  };

  // Zapisz snapshot magazynu
  const handleSaveSnapshot = async (snapshotData) => {
    setLoading(true);
    try {
      await setDoc(doc(collection(clientDb, "dailyWarehouseReports")), {
        sessionDay: selectedDate,
        type: "start",
        snapshot: snapshotData,
        timestamp: serverTimestamp(),
      });
      toast.success("Stan magazynowy zapisany!");
      setShowSnapshotModal(false);
      await refreshSessionStatus();
    } catch (err) {
      toast.error("Błąd podczas zapisywania stanu magazynowego");
    } finally {
      setLoading(false);
    }
  };

  if (daySessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Ładowanie...</div>
      </div>
    );
  }

  if (!isDayStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white text-3xl px-12 py-8 rounded-xl shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleStartDay}
          disabled={loading}
        >
          Rozpocznij dzień
        </button>
        <p className="text-gray-400 mt-8 text-lg">
          Aby korzystać z systemu, rozpocznij dzień pracy.
        </p>
        {showSnapshotModal && (
          <WarehouseSnapshotModal
            type="start"
            products={warehouseProducts}
            onSave={handleSaveSnapshot}
            onClose={() => setShowSnapshotModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Pulpit</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Aktywne zamówienia */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg text-gray-400">Aktywne zamówienia</h3>
            <p className="text-4xl font-bold mt-2 text-white">{aktywnych}</p>
            <p className="text-gray-400">Obecnie w realizacji</p>
          </div>
          <button
            onClick={() => (window.location.href = "/orders")}
            className="mt-4 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-500"
          >
            Pokaż aktywne
          </button>
        </div>
        {/* Zakończone zamówienia */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg text-gray-400">Zakończone</h3>
            <p className="text-4xl font-bold mt-2 text-white">{zakonczonych}</p>
            <p className="text-gray-400">W archiwum</p>
          </div>
          <button
            onClick={() => (window.location.href = "/history")}
            className="mt-4 bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-400"
          >
            Pokaż historię
          </button>
        </div>
        {/* Stan magazynowy */}
        <WarehouseStockTile />
      </div>
    </div>
  );
}
