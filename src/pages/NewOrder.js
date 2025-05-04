import React, { useState } from "react";
import burgers from "../data/burgers";
import extras from "../data/extras";
import ufoBurgers from "../data/ufo-burgers";
import { clientDb } from "../firebaseClientConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Wszystkie produkty
const products = [
  ...burgers.map((b) => ({ ...b, category: "burger" })),
  ...extras.map((e) => ({ ...e, category: "extra", price: e.price })),
  ...ufoBurgers.map((u) => ({ ...u, category: "ufo", price: u.price })),
];

export default function NewOrder() {
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderType, setOrderType] = useState("naMiejscu");
  const [items, setItems] = useState([]); // { id, name, meat?, qty, price }
  const [configuring, setConfiguring] = useState(null); // name of burger to configure
  const ordersCol = collection(clientDb, "orders");

  const addItem = (prod, selectedMeat) => {
    const key = prod.name + (selectedMeat || "");
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === key);
      if (idx > -1) {
        const next = [...prev];
        next[idx].qty++;
        return next;
      }
      const price =
        prod.category === "burger" ? prod.prices[selectedMeat] : prod.price;
      return [
        ...prev,
        { id: key, name: prod.name, meat: selectedMeat, qty: 1, price },
      ];
    });
    setConfiguring(null);
  };

  const removeItem = (index) =>
    setItems((prev) => prev.filter((_, idx) => idx !== index));

  const handleSubmit = async () => {
    if (!customer.trim() || items.length === 0) {
      return alert("Podaj imię klienta i dodaj przynajmniej jeden produkt.");
    }
    await addDoc(ordersCol, {
      customerName: customer,
      paymentMethod,
      orderType,
      items,
      status: "oczekuje",
      timestamp: serverTimestamp(),
      isArchived: false,
    });
    alert("Zamówienie utworzone!");
    setCustomer("");
    setItems([]);
  };

  return (
    <div className="p-6 bg-[#0d0c0c] rounded-lg shadow">
      <h2 className="text-2xl font-bold text-white mb-4">Nowe zamówienie</h2>

      {/* Dane klienta i szczegóły */}
      <div className="mb-4">
        <label className="block text-gray-300">Imię klienta</label>
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded"
        />
      </div>
      <div className="mb-6 flex space-x-4">
        <div>
          <label className="block text-gray-300">Płatność</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 px-3 py-2 bg-gray-700 text-white rounded"
          >
            <option value="cash">Gotówka</option>
            <option value="card">Karta</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-300">Typ zamówienia</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            className="mt-1 px-3 py-2 bg-gray-700 text-white rounded"
          >
            <option value="naMiejscu">Na miejscu</option>
            <option value="naWynos">Na wynos</option>
          </select>
        </div>
      </div>

      {/* Lista produktów */}
      <p className="text-gray-300 mb-2">Produkty</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {products.map((prod) => (
          <div
            key={prod.name}
            className="bg-gray-800 rounded p-4 cursor-pointer"
            onClick={() => {
              if (prod.category === "burger") {
                setConfiguring(prod.name);
              } else {
                addItem(prod);
              }
            }}
          >
            <h3 className="text-white font-semibold mb-2">{prod.name}</h3>
            {/* Jeśli ustawiamy mięso, pokaż opcje */}
            {configuring === prod.name && (
              <div className="mt-2 space-y-1">
                {prod.availableMeats.map((m) => (
                  <button
                    key={m}
                    onClick={() => addItem(prod, m)}
                    className="block w-full text-left bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                  >
                    {m === "smash90"
                      ? "Smash 90g"
                      : m === "beef"
                      ? "Wołowina"
                      : "Kurczak"}{" "}
                    - {prod.prices[m].toFixed(2)} zł
                  </button>
                ))}
                <button
                  onClick={() => setConfiguring(null)}
                  className="block w-full text-left bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                >
                  Anuluj wybór
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Koszyk */}
      <p className="text-gray-300 mb-2">Koszyk</p>
      {items.length ? (
        items.map((i, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center bg-gray-700 p-2 rounded mb-2"
          >
            <span className="text-white">
              {i.name}
              {i.meat ? ` (${i.meat})` : ""} x{i.qty}
            </span>
            <button onClick={() => removeItem(idx)} className="text-red-500">
              Usuń
            </button>
          </div>
        ))
      ) : (
        <p className="text-gray-400 mb-6">Brak produktów</p>
      )}

      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded"
      >
        Utwórz zamówienie
      </button>
    </div>
  );
}
