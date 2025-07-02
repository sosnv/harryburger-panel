import React, { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { useDaySession } from "../contexts/DaySessionContext";

export default function History() {
  const [orders, setOrders] = useState([]);
  const [sortOption, setSortOption] = useState("deletion");
  const { selectedDate } = useDaySession();
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    const ordersCollection = collection(clientDb, "orders");
    const unsubscribe = onSnapshot(ordersCollection, (snapshot) => {
      const fetched = snapshot.docs
        .filter((d) => {
          const data = d.data();
          return (
            data.isArchived &&
            // Sprawdzamy zamówienia z wybranego dnia
            (data.sessionDay === selectedDate ||
              // Fallback dla starszych zamówień bez sessionDay
              (!data.sessionDay &&
                data.timestamp &&
                data.timestamp.toDate().toISOString().split("T")[0] ===
                  selectedDate))
          );
        })
        .map((d) => ({ id: d.id, ...d.data() }));
      setOrders(fetched);
    });
    return () => unsubscribe();
  }, [selectedDate]);

  const clearHistory = async () => {
    if (
      !window.confirm(
        `Na pewno wyczyścić historię zamówień z dnia ${selectedDate}?`
      )
    )
      return;
    try {
      await Promise.all(
        orders.map((order) => deleteDoc(doc(clientDb, "orders", order.id)))
      );
    } catch (err) {
      console.error(err);
      alert("Błąd: nie udało się wyczyścić historii.");
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
  };

  const sorted = [...orders].sort((a, b) => {
    if (sortOption === "time")
      return b.timestamp?.toDate() - a.timestamp?.toDate();
    return b.deletionTimestamp?.toDate() - a.deletionTimestamp?.toDate();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">
        Historia zamówień - {selectedDate} ({sorted.length})
      </h2>
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
          Wyczyść historię tego dnia
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
                <button
                  onClick={() => handleEditOrder(order)}
                  className="mt-2 md:mt-0 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-4 py-2 rounded"
                >
                  Edytuj
                </button>
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
                {/* Obliczenia podsumowania */}
                {(() => {
                  const itemsTotal = order.items.reduce(
                    (sum, item) =>
                      sum + (item.price || 0) * (item.qty || item.quantity || 1),
                    0
                  );
                  const takeawayCost = (order.takeawayPackages || 0) * 1;
                  const deliveryCost =
                    order.orderType === "dostawa" && order.deliveryFee
                      ? order.deliveryFee
                      : 0;
                  const discountVal = order.discount || 0;
                  const grandTotal = itemsTotal + takeawayCost + deliveryCost - discountVal;

                  return (
                    <>
                      <p>
                        <span className="font-medium">Wartość produktów:</span>{" "}
                        {itemsTotal.toFixed(2)} zł
                      </p>
                      {order.orderType === "dostawa" && (
                        <p>
                          <span className="font-medium">Dostawa:</span>{" "}
                          {deliveryCost.toFixed(2)} zł
                        </p>
                      )}
                      {(order.orderType === "naWynos" || order.orderType === "dostawa") && (
                        <p>
                          <span className="font-medium">Opakowania na wynos:</span>{" "}
                          {takeawayCost.toFixed(2)} zł
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Zniżka:</span>{" "}
                        -{discountVal.toFixed(2)} zł
                      </p>
                      <p>
                        <span className="font-medium">Suma całkowita:</span>{" "}
                        {grandTotal.toFixed(2)} zł
                      </p>
                    </>
                  );
                })()}
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
                      <span> × {item.qty || item.quantity}</span>
                    </div>
                    <div className="text-gray-200">
                      {typeof item.price === "number" && !isNaN(item.price)
                        ? (
                            (item.price || 0) * (item.qty || item.quantity || 1)
                          ).toFixed(2) + " zł"
                        : "Brak ceny"}
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

      {/* Modal edycji zamówienia */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#0d0c0c] p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Edytuj zamówienie #{editingOrder.orderNumber}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Klient</label>
                <input
                  type="text"
                  value={editingOrder.customerName || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Typ zamówienia</label>
                <select
                  value={editingOrder.orderType || "naMiejscu"}
                  onChange={(e) => setEditingOrder({ ...editingOrder, orderType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                >
                  <option value="naMiejscu">Na miejscu</option>
                  <option value="naWynos">Na wynos</option>
                  <option value="dostawa">Dostawa</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Metoda płatności</label>
                <select
                  value={editingOrder.paymentMethod || "cash"}
                  onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                >
                  <option value="cash">Gotówka</option>
                  <option value="card">Karta</option>
                  <option value="blik">BLIK</option>
                  <option value="blikNaNumer">BLIK na numer</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Zniżka (zł)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingOrder.discount || 0}
                  onChange={(e) => setEditingOrder({ ...editingOrder, discount: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              {(editingOrder.orderType === "naWynos" || editingOrder.orderType === "dostawa") && (
                <div>
                  <label className="block text-gray-300 mb-1">Opakowania na wynos (1 zł/szt.)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingOrder.takeawayPackages || 0}
                    onChange={(e) => setEditingOrder({ ...editingOrder, takeawayPackages: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                  />
                </div>
              )}
              <div>
                <label className="block text-gray-300 mb-1">Pozycje zamówienia</label>
                <ul className="space-y-2">
                  {editingOrder.items?.map((item, i) => (
                    <li key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                      <div className="text-gray-200">
                        <span className="font-semibold">{item.name}</span>
                        {item.meat && <span> (Mięso: {item.meat})</span>}
                        {item.size && <span> (Rozmiar: {item.size})</span>}
                        <span> × {item.qty || item.quantity}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newItems = [...editingOrder.items];
                          newItems.splice(i, 1);
                          setEditingOrder({ ...editingOrder, items: newItems });
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        Usuń
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setEditingOrder(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded"
              >
                Anuluj
              </button>
              <button
                onClick={async () => {
                  try {
                    await updateDoc(doc(clientDb, "orders", editingOrder.id), {
                      customerName: editingOrder.customerName,
                      orderType: editingOrder.orderType,
                      paymentMethod: editingOrder.paymentMethod,
                      discount: editingOrder.discount,
                      takeawayPackages: editingOrder.takeawayPackages,
                      items: editingOrder.items,
                    });
                    setEditingOrder(null);
                  } catch (e) {
                    alert("Błąd podczas zapisu zmian");
                  }
                }}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
