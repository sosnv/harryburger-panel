import React, { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";

export default function History() {
  const [orders, setOrders] = useState([]);
  const [sortOption, setSortOption] = useState("deletion");

  useEffect(() => {
    const ordersCollection = collection(clientDb, "orders");
    const unsubscribe = onSnapshot(ordersCollection, (snapshot) => {
      const fetched = snapshot.docs
        .filter((d) => d.data().isArchived)
        .map((d) => ({ id: d.id, ...d.data() }));
      setOrders(fetched);
    });
    return () => unsubscribe();
  }, []);

  const clearHistory = async () => {
    if (!window.confirm("Na pewno wyczyścić całą historię zamówień?")) return;
    try {
      await Promise.all(
        orders.map((order) => deleteDoc(doc(clientDb, "orders", order.id)))
      );
    } catch (err) {
      console.error(err);
      alert("Błąd: nie udało się wyczyścić historii.");
    }
  };

  const sorted = [...orders].sort((a, b) => {
    if (sortOption === "time")
      return b.timestamp?.toDate() - a.timestamp?.toDate();
    return b.deletionTimestamp?.toDate() - a.deletionTimestamp?.toDate();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Historia</h2>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <label className="text-gray-300 font-medium">Sortuj:</label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-1"
          >
            <option value="deletion">Czas usunięcia</option>
            <option value="time">Czas złożenia</option>
          </select>
        </div>
        <button
          onClick={clearHistory}
          className="bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded"
        >
          Wyczyść historię
        </button>
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-4">
          {sorted.map((order) => (
            <div key={order.id} className="bg-[#1a1a1a] p-6 rounded-lg shadow">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Zamówienie #{order.orderNumber}
                </h3>
                <span className="mt-2 md:mt-0 px-3 py-1 rounded-full text-sm font-medium bg-gray-500 text-white">
                  Wydane
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-gray-300">
                <p>
                  <span className="font-medium">Metoda płatności:</span>{" "}
                  {order.paymentMethod === "cash"
                    ? "Gotówka"
                    : order.paymentMethod}
                </p>
                <p>
                  <span className="font-medium">Klient:</span>{" "}
                  {order.customerName}
                </p>
                <p>
                  <span className="font-medium">Typ:</span> {order.orderType}
                </p>
                <p>
                  <span className="font-medium">Złożone:</span>{" "}
                  {new Date(order.timestamp?.toDate()).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Usunięte:</span>{" "}
                  {new Date(order.deletionTimestamp?.toDate()).toLocaleString()}
                </p>
              </div>
              <ul className="space-y-2">
                {order.items?.map((item, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center bg-gray-700 p-3 rounded"
                  >
                    <div className="text-gray-200">
                      <span className="font-semibold">{item.name}</span>
                      {item.meat && <span> (Mięso: {item.meat})</span>}
                      {item.size && <span> (Rozmiar: {item.size})</span>}
                      {item.flavor && <span> (Smak: {item.flavor})</span>}
                      <span> × {item.quantity}</span>
                    </div>
                    <div className="text-gray-200">
                      {(item.price * item.quantity).toFixed(2)} zł
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1a1a1a] p-6 rounded-lg shadow text-center">
          <p className="text-gray-400 text-lg">Brak zamówień w historii</p>
        </div>
      )}
    </div>
  );
}
