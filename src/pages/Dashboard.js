import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [aktywnych, setAktywnych] = useState(0);
  const [zakonczonych, setZakonczonych] = useState(0);
  const navigate = useNavigate();

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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Pulpit</h2>
      <div className="grid grid-cols-2 gap-6">
        {/* Aktywne zamówienia */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg text-gray-400">Aktywne zamówienia</h3>
            <p className="text-4xl font-bold mt-2 text-white">{aktywnych}</p>
            <p className="text-gray-400">Obecnie w realizacji</p>
          </div>
          <button
            onClick={() => navigate("/orders")}
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
            onClick={() => navigate("/history")}
            className="mt-4 bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-400"
          >
            Pokaż historię
          </button>
        </div>
      </div>
    </div>
  );
}
