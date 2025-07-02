import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { useDaySession } from "../contexts/DaySessionContext";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [sortOption, setSortOption] = useState("time");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [editing, setEditing] = useState({ orderId: null, itemIdx: null });
  const [selectedMeat, setSelectedMeat] = useState("");
  const [editingPayment, setEditingPayment] = useState({
    orderId: null,
    value: "",
  });
  const [editingOrderType, setEditingOrderType] = useState({
    orderId: null,
    value: "",
  });
  const [editingOrder, setEditingOrder] = useState(null);
  const { selectedDate } = useDaySession();

  useEffect(() => {
    const ordersRef = collection(clientDb, "orders");
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((order) => {
          return (
            !order.isArchived &&
            // Sprawdzamy zamówienia z wybranego dnia
            (order.sessionDay === selectedDate ||
              // Fallback dla starszych zamówień bez sessionDay
              (!order.sessionDay &&
                order.timestamp &&
                order.timestamp.toDate().toISOString().split("T")[0] ===
                  selectedDate))
          );
        });
      setOrders(data);
    });
    return () => unsubscribe();
  }, [selectedDate]);

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

  const handleEditMeat = (orderId, itemIdx, currentMeat) => {
    setEditing({ orderId, itemIdx });
    setSelectedMeat(currentMeat || "beef");
  };

  const handleSaveMeat = async (orderId, itemIdx) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map((item, idx) =>
      idx === itemIdx ? { ...item, meat: selectedMeat } : item
    );
    try {
      await updateDoc(doc(clientDb, "orders", orderId), {
        items: updatedItems,
      });
      setEditing({ orderId: null, itemIdx: null });
    } catch (e) {
      alert("Błąd podczas zapisu zmiany mięsa");
    }
  };

  const handleEditPayment = (orderId, currentPayment) => {
    setEditingPayment({ orderId, value: currentPayment });
  };

  const handleSavePayment = async (orderId) => {
    try {
      await updateDoc(doc(clientDb, "orders", orderId), {
        paymentMethod: editingPayment.value,
      });
      setEditingPayment({ orderId: null, value: "" });
    } catch (e) {
      alert("Błąd podczas zapisu metody płatności");
    }
  };

  const handleEditOrderType = (orderId, currentType) => {
    setEditingOrderType({ orderId, value: currentType });
  };

  const handleSaveOrderType = async (orderId) => {
    try {
      await updateDoc(doc(clientDb, "orders", orderId), {
        orderType: editingOrderType.value,
      });
      setEditingOrderType({ orderId: null, value: "" });
    } catch (e) {
      alert("Błąd podczas zapisu typu zamówienia");
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
  };

  const sorted = [...orders].sort((a, b) => {
    if (sortOption === "time")
      return b.timestamp?.toDate() - a.timestamp?.toDate();
    return a.orderNumber - b.orderNumber;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">
        Aktywne zamówienia - {selectedDate}
      </h2>
      {/* Sortowanie */}
      <div className="flex items-center mb-4">
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
        {sorted.length > 0 ? (
          sorted.map((order) => {
            const isPaid = order.status === "opłacono zamówienie";
            const total =
              (order.items?.reduce(
                (sum, item) => sum + item.price * item.qty,
                0
              ) || 0) + (order.deliveryFee || 0);
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
                    {editingPayment.orderId === order.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editingPayment.value}
                          onChange={(e) =>
                            setEditingPayment((prev) => ({
                              ...prev,
                              value: e.target.value,
                            }))
                          }
                          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
                        >
                          <option value="cash">Gotówka</option>
                          <option value="card">Karta</option>
                          <option value="blik">BLIK</option>
                          <option value="blikNaNumer">BLIK na numer</option>
                        </select>
                        <button
                          onClick={() => handleSavePayment(order.id)}
                          className="text-green-400 hover:text-green-300"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() =>
                            setEditingPayment({ orderId: null, value: "" })
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <p className="text-white font-semibold">
                          {order.splitPayment && Array.isArray(order.splitPayment) ? (
                            <span>
                              Podzielona:&nbsp;
                              {order.splitPayment
                                .filter(p => p.amount > 0)
                                .map((p, idx) => (
                                  <span key={idx}>
                                    {p.method === "cash"
                                      ? "Gotówka"
                                      : p.method === "card"
                                      ? "Karta"
                                      : p.method === "blik_numer"
                                      ? "BLIK na numer"
                                      : p.method}
                                    &nbsp;({p.amount.toFixed(2)} zł)
                                    {idx < order.splitPayment.length - 1 ? " + " : ""}
                                  </span>
                                ))}
                            </span>
                          ) : order.paymentMethod === "cash"
                            ? "Gotówka"
                            : order.paymentMethod === "blikNaNumer" || order.paymentMethod === "blik_numer"
                            ? "BLIK na numer"
                            : order.paymentMethod
                          }
                        </p>
                        {!isPaid && (
                          <button
                            onClick={() =>
                              handleEditPayment(order.id, order.paymentMethod)
                            }
                            className="ml-2 text-blue-400 hover:text-blue-300"
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <p className="text-sm text-gray-400">Klient:</p>
                    <p className="text-white font-semibold">
                      {order.customerName}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <p className="text-sm text-gray-400">Typ:</p>
                    {editingOrderType.orderId === order.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editingOrderType.value}
                          onChange={(e) =>
                            setEditingOrderType((prev) => ({
                              ...prev,
                              value: e.target.value,
                            }))
                          }
                          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
                        >
                          <option value="naMiejscu">Na miejscu</option>
                          <option value="naWynos">Na wynos</option>
                          <option value="dostawa">Dostawa</option>
                        </select>
                        <button
                          onClick={() => handleSaveOrderType(order.id)}
                          className="text-green-400 hover:text-green-300"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() =>
                            setEditingOrderType({ orderId: null, value: "" })
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <p className="text-white font-semibold">
                          {order.orderType === "naMiejscu"
                            ? "Na miejscu"
                            : order.orderType === "naWynos"
                            ? "Na wynos"
                            : order.orderType === "dostawa"
                            ? `Dostawa (${
                                order.deliveryFee
                                  ? order.deliveryFee.toFixed(2) + " zł"
                                  : ""
                              })`
                            : order.orderType}
                        </p>
                        {!isPaid && (
                          <button
                            onClick={() =>
                              handleEditOrderType(order.id, order.orderType)
                            }
                            className="ml-2 text-blue-400 hover:text-blue-300"
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <p className="text-sm text-gray-400">Złożone:</p>
                    <p className="text-white font-semibold">
                      {new Date(order.timestamp?.toDate()).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Adnotacje klienta */}
                {order.customerNote && (
                  <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded">
                    <p className="text-sm text-yellow-400">
                      <span className="font-semibold">Uwagi klienta:</span>{" "}
                      {order.customerNote}
                    </p>
                  </div>
                )}

                {/* Pozycje */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Pozycje</p>
                  <ul className="space-y-2">
                    {order.items?.map((item, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center py-2 px-4 bg-gray-700 rounded"
                      >
                        <div className="text-gray-200 flex items-center gap-2">
                          <span className="font-semibold">{item.name}</span>
                          {item.meat && (
                            <span className="ml-2 text-gray-400">
                              (Mięso:{" "}
                              {item.meat === "smash90"
                                ? "Smash 90g"
                                : item.meat === "beef"
                                ? "Wołowina"
                                : item.meat === "chicken"
                                ? "Kurczak"
                                : item.meat}
                              )
                            </span>
                          )}
                          {!isPaid &&
                            item.category === "burger" &&
                            (editing.orderId === order.id &&
                            editing.itemIdx === i ? (
                              <>
                                <select
                                  value={selectedMeat}
                                  onChange={(e) =>
                                    setSelectedMeat(e.target.value)
                                  }
                                  className="bg-gray-800 text-white px-2 py-1 rounded ml-2"
                                >
                                  <option value="beef">Wołowina</option>
                                  <option value="chicken">Kurczak</option>
                                  <option value="smash90">Smash 90g</option>
                                </select>
                                <button
                                  onClick={() => handleSaveMeat(order.id, i)}
                                  className="ml-2 bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded"
                                >
                                  Zapisz
                                </button>
                                <button
                                  onClick={() =>
                                    setEditing({ orderId: null, itemIdx: null })
                                  }
                                  className="ml-2 bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
                                >
                                  Anuluj
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  handleEditMeat(order.id, i, item.meat)
                                }
                                className="ml-2 text-blue-400 underline text-sm"
                              >
                                Edytuj mięso
                              </button>
                            ))}
                          <span className="ml-2">x{item.qty}</span>
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
                    {!isPaid && (
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-4 py-2 rounded ml-2"
                      >
                        Edytuj
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
                    <span className="text-gray-300 font-medium mr-2">
                      SUMA:
                    </span>
                    <span className="text-red-500 font-bold text-lg">
                      {total.toFixed(2)} zł
                    </span>
                  </div>
                </div>
              </li>
            );
          })
        ) : (
          <div className="bg-[#1a1a1a] p-6 rounded-lg shadow text-center">
            <p className="text-gray-400 text-lg">Brak aktywnych zamówień</p>
          </div>
        )}
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
