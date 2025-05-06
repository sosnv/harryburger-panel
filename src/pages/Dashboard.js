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
import jsPDF from "jspdf";
import { FaLock } from "react-icons/fa";

export default function Dashboard() {
  const [aktywnych, setAktywnych] = useState(0);
  const [zakonczonych, setZakonczonych] = useState(0);
  const {
    isDayStarted,
    loading: daySessionLoading,
    selectedDate,
    refreshSessionStatus,
    isDayEnded,
    setIsDayEnded,
  } = useDaySession();
  const [loading, setLoading] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotType, setSnapshotType] = useState("start");
  const [warehouseProducts, setWarehouseProducts] = useState([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [hasEndSnapshot, setHasEndSnapshot] = useState(false);

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

  useEffect(() => {
    const checkEndSnapshot = async () => {
      if (isDayEnded) {
        const snapQ = collection(clientDb, "dailyWarehouseReports");
        const snapDocs = await getDocs(snapQ);
        const found = snapDocs.docs
          .map((doc) => doc.data())
          .find(
            (snap) => snap.sessionDay === selectedDate && snap.type === "end"
          );
        setHasEndSnapshot(!!found);
      }
    };
    checkEndSnapshot();
  }, [isDayEnded, selectedDate]);

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

  // Zamknij dzień
  const handleEndDay = async () => {
    if (aktywnych > 0) {
      toast.error("Nie można zamknąć dnia z aktywnymi zamówieniami!");
      return;
    }
    setLoading(true);
    try {
      const sessionRef = doc(clientDb, "dailySessions", selectedDate);
      await updateDoc(sessionRef, {
        isDayEnded: true,
        endedAt: serverTimestamp(),
      });
      await refreshSessionStatus();
      toast.success("Dzień został zamknięty!");

      // Pobierz produkty i pokaż modal końcowego stanu magazynowego
      const snapshot = await getDocs(collection(clientDb, "warehouse"));
      setWarehouseProducts(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setSnapshotType("end");
      setShowSnapshotModal(true);
    } catch (err) {
      toast.error("Błąd podczas zamykania dnia: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // PDF generation handler
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Fetch warehouse snapshot (start/end) and orders for the day
      const snapQ = collection(clientDb, "dailyWarehouseReports");
      const snapDocs = await getDocs(snapQ);
      const snapshots = snapDocs.docs
        .map((doc) => doc.data())
        .filter((snap) => snap.sessionDay === selectedDate);
      const endSnap = snapshots.find((s) => s.type === "end");
      const startSnap = snapshots.find((s) => s.type === "start");
      const warehouseSnap = endSnap || startSnap;
      const ordersQ = collection(clientDb, "orders");
      const ordersDocs = await getDocs(ordersQ);
      const orders = ordersDocs.docs
        .map((doc) => doc.data())
        .filter((order) => {
          if (!order.timestamp) return false;
          const date = order.timestamp.toDate().toISOString().split("T")[0];
          return date === selectedDate;
        });
      // Generate PDF
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Raport dnia: ${selectedDate}`, 10, 15);
      doc.setFontSize(12);
      doc.text(`Liczba zamówień: ${orders.length}`, 10, 30);
      let y = 40;
      if (warehouseSnap) {
        doc.text("Stan magazynowy:", 10, y);
        y += 7;
        Object.values(warehouseSnap.snapshot).forEach((prod) => {
          doc.text(`${prod.name}: ${prod.quantity} ${prod.unit}`, 14, y);
          y += 6;
        });
      }
      doc.save(`raport_${selectedDate}.pdf`);
    } catch (e) {
      alert("Błąd generowania PDF");
    }
    setGeneratingPDF(false);
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
    <div className="space-y-6 relative min-h-screen">
      {/* Informacja o zamknięciu dnia */}
      {isDayEnded && (
        <div className="w-full bg-blue-900 text-blue-200 text-center py-3 text-lg font-semibold rounded-b-xl shadow mb-4">
          Dzień zamknięty – wszystkie operacje zablokowane
        </div>
      )}
      <h2 className="text-3xl font-bold text-white">Pulpit</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Aktywne zamówienia */}
        <div
          className={`bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between ${
            isDayEnded ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <div>
            <h3 className="text-lg text-gray-400">Aktywne zamówienia</h3>
            {aktywnych > 0 ? (
              <>
                <p className="text-4xl font-bold mt-2 text-white">
                  {aktywnych}
                </p>
                <p className="text-gray-400">Obecnie w realizacji</p>
              </>
            ) : (
              <div className="mt-2">
                <p className="text-4xl font-bold text-gray-500">0</p>
                <p className="text-gray-400">Brak aktywnych zamówień</p>
              </div>
            )}
          </div>
          <button
            onClick={() => (window.location.href = "/orders")}
            className="mt-4 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-500"
            disabled={isDayEnded}
          >
            Pokaż aktywne
          </button>
        </div>
        {/* Zakończone zamówienia */}
        <div
          className={`bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between ${
            isDayEnded ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <div>
            <h3 className="text-lg text-gray-400">Zakończone</h3>
            <p className="text-4xl font-bold mt-2 text-white">{zakonczonych}</p>
            <p className="text-gray-400">W archiwum</p>
          </div>
          <button
            onClick={() => (window.location.href = "/history")}
            className="mt-4 bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-400"
            disabled={isDayEnded}
          >
            Pokaż historię
          </button>
        </div>
        {/* Skrót do tworzenia zamówienia */}
        <div
          className={`bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between ${
            isDayEnded ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <div>
            <h3 className="text-lg text-gray-400 mb-6">Nowe zamówienie</h3>
          </div>
          <button
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-500 w-full font-semibold"
            onClick={() => (window.location.href = "/new-order")}
            disabled={isDayEnded}
          >
            Stwórz zamówienie
          </button>
        </div>
        {/* Stan magazynowy */}
        <div>
          <WarehouseStockTile
            showSnapshots={isDayEnded}
            onSnapshotClick={(type) => {
              setSnapshotType(type);
              setShowSnapshotModal(true);
            }}
          />
        </div>
      </div>
      {/* Floating action button w prawym dolnym rogu */}
      {!isDayEnded && (
        <button
          onClick={handleEndDay}
          disabled={aktywnych > 0}
          className={`fixed bottom-6 right-6 p-4 text-white font-bold flex items-center space-x-2 ${
            aktywnych > 0
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-500"
          } rounded-lg shadow-lg transition-colors`}
        >
          {aktywnych > 0 ? (
            <span className="flex items-center gap-2">
              <FaLock className="text-lg" />
              Nie można zamknąć dnia (aktywne zamówienia)
            </span>
          ) : (
            "Zamknij dzień"
          )}
        </button>
      )}
      {/* Pobierz raport PDF po zamknięciu dnia */}
      {isDayEnded && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-full font-bold shadow-xl transition-all"
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? "Generowanie PDF..." : "Pobierz raport PDF"}
          </button>
        </div>
      )}
      {/* Modal snapshotu magazynu */}
      {showSnapshotModal && (
        <WarehouseSnapshotModal
          type={snapshotType}
          products={warehouseProducts}
          onSave={async (data) => {
            await handleSaveSnapshot(data);
            if (snapshotType === "end") {
              setHasEndSnapshot(true);
            }
          }}
          onClose={() => setShowSnapshotModal(false)}
        />
      )}
    </div>
  );
}
