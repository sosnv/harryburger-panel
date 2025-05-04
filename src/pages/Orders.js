import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [sortOption, setSortOption] = useState("time");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    const ordersRef = collection(clientDb, "orders");
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((order) => !order.isArchived);
      setOrders(data);
    });
    return () => unsubscribe();
  }, []);

  const openConfirm = (id, action) => {
    const msg =
      action === "paid"
        ? "Czy oznaczyć zamówienie jako opłacone?"
        : "Czy oznaczyć zamówienie jako wydane?";
    setPendingId(id);
    setPendingAction(action);
    setConfirmMessage(msg);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    const ref = doc(clientDb, "orders", pendingId);
    try {
      if (pendingAction === "paid") {
        await updateDoc(ref, {
          status: "opłacono zamówienie",
          paidTimestamp: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          isArchived: true,
          deletionTimestamp: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error(e);
      alert("Operacja nie powiodła się.");
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
      setPendingId(null);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingAction(null);
    setPendingId(null);
  };

  const sorted = [...orders].sort((a, b) => {
    if (sortOption === "time")
      return b.timestamp?.toDate() - a.timestamp?.toDate();
    return a.orderNumber - b.orderNumber;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Aktywne zamówienia</h2>
      {/* Sortowanie */}
      <div className="flex items-center justify-end mb-4">
        <label className="mr-2 text-gray-300 font-medium">Sortuj:</label>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-1"
        >
          <option value="time">Czas złożenia</option>
          <option value="orderNumber">Numer</option>
        </select>
      </div>

      <ul className="space-y-4">
        {sorted.map((order) => {
          const isPaid = order.status === "opłacono zamówienie";
          const total =
            order.items?.reduce(
              (sum, item) => sum + item.price * item.qty,
              0
            ) || 0;
          return (
            <li key={order.id} className="bg-[#1a1a1a] p-6 rounded-lg shadow">
              {/* Nagłówek */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Zamówienie #{order.orderNumber}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isPaid
                      ? "bg-green-600 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {isPaid ? "Opłacone" : "Oczekuje"}
                </span>
              </div>

              {/* Szczegóły w jednej linii */}
              <div className="flex flex-wrap items-center justify-between w-full mb-4 text-gray-300 space-x-6">
                <div className="flex items-center space-x-1">
                  <p className="text-sm text-gray-400">Metoda:</p>
                  <p className="text-white font-semibold">
                    {order.paymentMethod === "cash"
                      ? "Gotówka"
                      : order.paymentMethod}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <p className="text-sm text-gray-400">Klient:</p>
                  <p className="text-white font-semibold">
                    {order.customerName}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <p className="text-sm text-gray-400">Typ:</p>
                  <p className="text-white font-semibold">
                    {order.orderType === "naMiejscu"
                      ? "Na miejscu"
                      : order.orderType === "naWynos"
                      ? "Na wynos"
                      : order.orderType}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <p className="text-sm text-gray-400">Złożone:</p>
                  <p className="text-white font-semibold">
                    {new Date(order.timestamp?.toDate()).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Pozycje */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Pozycje</p>
                <ul className="space-y-2">
                  {order.items?.map((item, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-center py-2 px-4 bg-gray-700 rounded"
                    >
                      <div className="text-gray-200">
                        <span className="font-semibold">{item.name}</span> x
                        {item.qty}
                      </div>
                      <span className="text-white font-medium">
                        {(item.price * item.qty).toFixed(2)} zł
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Akcje i suma w jednej linii */}
              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  {!isPaid && (
                    <button
                      onClick={() => openConfirm(order.id, "paid")}
                      className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2 rounded"
                    >
                      Oznacz jako opłacone
                    </button>
                  )}
                  {isPaid && (
                    <button
                      onClick={() => openConfirm(order.id, "delivered")}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded"
                    >
                      Oznacz jako wydane
                    </button>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-gray-300 font-medium mr-2">SUMA:</span>
                  <span className="text-red-500 font-bold text-lg">
                    {total.toFixed(2)} zł
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Modal potwierdzenia */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-[#0d0c0c] p-6 rounded-lg shadow-lg max-w-sm text-center">
            <p className="text-white mb-6">{confirmMessage}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded"
              >
                Tak
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
