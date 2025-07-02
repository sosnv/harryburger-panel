// src/pages/CurrentOrders.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";
import { clientDb } from "../firebaseClientConfig";
import { useDaySession } from "../contexts/DaySessionContext";

function CurrentOrders() {
  const [orders, setOrders] = useState([]);
  const [showDeleteNotification, setShowDeleteNotification] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [orderIdToDelete, setOrderIdToDelete] = useState(null);
  const { selectedDate } = useDaySession();

  useEffect(() => {
    const ordersCollection = collection(clientDb, "orders");

    const unsubscribe = onSnapshot(ordersCollection, (snapshot) => {
      const fetchedOrders = snapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return (
            !data.isArchived &&
            // Sprawdzamy zamówienia z wybranego dnia
            (data.sessionDay === selectedDate ||
              // Fallback dla starszych zamówień bez sessionDay
              (!data.sessionDay &&
                data.timestamp &&
                data.timestamp.toDate().toISOString().split("T")[0] ===
                  selectedDate))
          );
        })
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      setOrders(fetchedOrders);
    });

    return () => unsubscribe();
  }, [selectedDate]); // Dodanie selectedDate jako dependency

  // Funkcja do potwierdzenia usunięcia zamówienia
  const confirmDeleteOrder = (orderId) => {
    setOrderIdToDelete(orderId);
    setShowConfirmDelete(true);
  };

  // Funkcja do usuwania zamówienia po potwierdzeniu
  const handleDelete = async () => {
    try {
      const orderRef = doc(clientDb, "orders", orderIdToDelete);
      await updateDoc(orderRef, {
        isArchived: true,
        deletionTimestamp: new Date(),
      });

      setShowDeleteNotification(true);
      setTimeout(() => setShowDeleteNotification(false), 2000);
    } catch (error) {
      console.error("Błąd podczas usuwania zamówienia: ", error);
      alert("Nie udało się usunąć zamówienia. Spróbuj ponownie.");
    } finally {
      setShowConfirmDelete(false);
      setOrderIdToDelete(null);
    }
  };

  // Funkcja do oznaczania zamówienia jako opłacone
  const markAsPaid = async (orderId) => {
    try {
      const orderRef = doc(clientDb, "orders", orderId);
      await updateDoc(orderRef, { status: "opłacono zamówienie" });
      alert("Zamówienie zostało oznaczone jako opłacone.");
    } catch (error) {
      console.error("Błąd podczas aktualizacji zamówienia: ", error);
      alert(
        "Nie udało się oznaczyć zamówienia jako opłacone. Spróbuj ponownie."
      );
    }
  };

  return (
    <div className="space-y-6">
      {Array.isArray(orders) && orders.length > 0 ? (
        orders.map((order) => (
          <div
            key={order.id}
            className="p-6 bg-white shadow-md rounded-lg flex flex-col"
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
              <h2 className="text-2xl font-semibold mb-2 md:mb-0">
                <span className="text-black">Zamówienie </span>
                <span className="text-orange-600 font-bold">
                  #{order.orderNumber}
                </span>
              </h2>
              <p
                className={`font-bold text-lg ${
                  order.status === "opłacono zamówienie"
                    ? "text-green-600"
                    : "text-orange-500"
                }`}
              >
                {order.status === "opłacono zamówienie"
                  ? "Opłacono zamówienie"
                  : "Oczekuje na opłacenie"}
              </p>
            </div>

            {/* Szczegóły zamówienia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <p>
                <span className="font-semibold">Metoda płatności:</span>{" "}
                <span className="font-bold">{order.paymentMethod}</span>
              </p>
              <p>
                <span className="font-semibold">Imię:</span>{" "}
                <span className="font-bold">{order.customerName}</span>
              </p>
              <p>
                <span className="font-semibold">Typ zamówienia:</span>{" "}
                <span className="font-bold">
                  {order.orderType === "naMiejscu" ? "Na miejscu" : "Na wynos"}
                </span>
              </p>
              <p>
                <span className="font-semibold">Data:</span>{" "}
                <span className="font-bold">
                  {new Date(order.timestamp?.toDate()).toLocaleString()}
                </span>
              </p>
            </div>

            {/* Tabela przedmiotów w zamówieniu */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Przedmioty:</h3>
              <table className="min-w-full bg-gray-50 rounded-md overflow-hidden">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">
                      Nazwa
                    </th>
                    <th className="text-left p-2 font-medium text-gray-600">
                      Ilość
                    </th>
                    <th className="text-right p-2 font-medium text-gray-600">
                      Cena
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(order.items) ? (
                    order.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">
                          <span>{item.name}</span>
                          {item.meat && (
                            <div className="text-red-600 font-bold text-sm">
                              (Mięso: {item.meat})
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center font-bold">
                          {item.quantity}
                        </td>
                        <td className="p-2 text-right font-bold">
                          {(item.price * item.quantity).toFixed(2)} zł
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center p-2">
                        Brak danych o przedmiotach
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Przyciski */}
            <div className="flex flex-col md:flex-row md:justify-end md:items-center space-y-2 md:space-y-0 md:space-x-4">
              {order.status !== "opłacono zamówienie" && (
                <button
                  onClick={() => markAsPaid(order.id)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                >
                  Oznacz jako opłacone
                </button>
              )}
              <button
                onClick={() => confirmDeleteOrder(order.id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Usuń zamówienie
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-600">
          Brak zamówień do wyświetlenia.
        </p>
      )}

      {/* Okno potwierdzenia usunięcia */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="text-xl font-semibold mb-4">
              Czy na pewno chcesz usunąć zamówienie?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-6 py-2 rounded-lg"
              >
                Usuń
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Powiadomienie o usunięciu */}
      {showDeleteNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div className="bg-white text-red-600 p-6 rounded-full shadow-lg flex flex-col items-center">
            <span className="text-5xl font-bold">✗</span>
            <p className="mt-2 font-semibold">Zamówienie zostało usunięte</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default CurrentOrders;
