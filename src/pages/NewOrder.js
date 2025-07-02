import React, { useState, useEffect } from "react";
import burgers from "../data/burgers";
import extras from "../data/extras";
import drinks from "../data/drinks";
import ufoBurgers from "../data/ufo-burgers";
import { warehouseProducts } from "../data/warehouseProducts";
import { clientDb } from "../firebaseClientConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { useDaySession } from "../contexts/DaySessionContext";

// Wszystkie produkty
const products = [
  ...burgers.map((b) => ({ ...b, category: "burger" })),
  ...extras.map((e) => ({ ...e, category: "extra", price: e.price })),
  ...drinks.map((d) => ({ ...d, category: "drink" })),
  ...ufoBurgers.map((u) => ({ ...u, category: "ufo", price: u.price })),
];

export default function NewOrder() {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderType, setOrderType] = useState("naMiejscu");
  const [items, setItems] = useState([]);
  const [configuring, setConfiguring] = useState(null);
  const [selectedSize, setSelectedSize] = useState("0.5l");
  const [activeCategory, setActiveCategory] = useState("burger");
  const ordersCol = collection(clientDb, "orders");
  const { selectedDate } = useDaySession();
  const [warehouseSnapshot, setWarehouseSnapshot] = useState(null);
  const [warehouseLoading, setWarehouseLoading] = useState(true);
  const [nextOrderNumber, setNextOrderNumber] = useState(null);
  const [splitPayment, setSplitPayment] = useState(false);
  const [payments, setPayments] = useState([
    { method: "cash", amount: "" },
    { method: "card", amount: "" },
    { method: "blik_numer", amount: "" },
  ]);
  const [discount, setDiscount] = useState(0);
  const [takeawayPackages, setTakeawayPackages] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const addItem = (prod, selectedMeat) => {
    const key =
      prod.name +
      (prod.category === "burger" ? (selectedMeat || "") : "") +
      (prod.prices && selectedSize ? selectedSize : "");
      
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === key);
      if (idx > -1) {
        const next = [...prev];
        next[idx].qty++;
        return next;
      }
      let price;
      if (prod.category === "burger") {
        price = prod.prices[selectedMeat];
      } else if (prod.prices) {
        price = prod.prices[selectedSize];
      } else {
        price = prod.price;
      }

      // Sprawdzenie czy price nie jest undefined
      if (price === undefined || price === null) {
        console.error(
          "Cena nie została znaleziona dla produktu:",
          prod.name,
          "rozmiar:",
          selectedSize
        );
        alert(
          "Błąd: Nie można znaleźć ceny dla tego produktu. Spróbuj ponownie."
        );
        return prev;
      }

      return [
        ...prev,
        {
          id: key,
          name: prod.name,
          meat: selectedMeat,
          size: prod.prices ? selectedSize : null,
          qty: 1,
          price,
        },
      ];
    });
    setConfiguring(null);
  };

  const removeItem = (index) =>
    setItems((prev) => prev.filter((_, idx) => idx !== index));

  const handleSubmit = async () => {
    if (items.length === 0) {
      return alert("Dodaj przynajmniej jeden produkt.");
    }
    const total =
      items.reduce(
        (sum, item) => sum + (item.price || 0) * (item.qty || 0),
        0
      ) +
      takeawayPackages * 1 +
      (orderType === "dostawa" ? deliveryFee : 0);
    let paymentData;
    if (!splitPayment) {
      paymentData = [{ method: paymentMethod, amount: total - discount }];
    } else {
      const filtered = payments.filter((p) => p.amount && parseFloat(p.amount) > 0);
      const sum = filtered.reduce((acc, p) => acc + parseFloat(p.amount), 0);
      if (Math.abs(sum - (total - discount)) > 0.01) {
        return alert("Suma kwot płatności musi być równa sumie zamówienia po zniżce!");
      }
      paymentData = filtered.map((p) => ({ method: p.method, amount: parseFloat(p.amount) }));
    }
    // Przygotowanie danych zamówienia
    const orderData = {
      orderType,
      discount,
      takeawayPackages,
      deliveryFee: orderType === "dostawa" ? deliveryFee : 0,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        meat: item.meat || null,
        size: item.size || null,
        qty: item.qty,
        price: item.price,
      })),
      status: "oczekuje",
      timestamp: serverTimestamp(),
      isArchived: false,
      orderNumber: nextOrderNumber,
      sessionDay: selectedDate,
    };
    if (!splitPayment) {
      orderData.paymentMethod = paymentMethod;
    } else {
      orderData.splitPayment = paymentData;
    }
    try {
      await addDoc(ordersCol, orderData);
      alert("Zamówienie utworzone!");
      setItems([]);
      setPayments([
        { method: "cash", amount: "" },
        { method: "card", amount: "" },
        { method: "blik_numer", amount: "" },
      ]);
      setSplitPayment(false);
      setDiscount(0);
      setTakeawayPackages(0);
      setDeliveryFee(0);
    } catch (error) {
      console.error("Błąd podczas tworzenia zamówienia:", error);
      alert("Wystąpił błąd podczas tworzenia zamówienia. Spróbuj ponownie.");
    }
  };

  const filteredProducts = products.filter(
    (p) => p.category === activeCategory
  );

  useEffect(() => {
    async function fetchSnapshot() {
      setWarehouseLoading(true);
      const snapQ = collection(clientDb, "dailyWarehouseReports");
      const snapDocs = await getDocs(snapQ);
      const found = snapDocs.docs
        .map((doc) => doc.data())
        .find(
          (snap) => snap.sessionDay === selectedDate && snap.type === "start"
        );
      setWarehouseSnapshot(found ? found.snapshot : null);
      setWarehouseLoading(false);
    }
    fetchSnapshot();
  }, [selectedDate]);

  // Fetch next order number on mount
  useEffect(() => {
    async function fetchOrderNumber() {
      const ordersCol = collection(clientDb, "orders");
      const snap = await getDocs(ordersCol);
      let maxNum = 0;
      snap.docs.forEach((doc) => {
        const n = doc.data().orderNumber;
        if (typeof n === "number" && n > maxNum) maxNum = n;
      });
      setNextOrderNumber(maxNum + 1);
    }
    fetchOrderNumber();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Nowe zamówienie</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lewa kolumna - Dane klienta i koszyk */}
        <div className="lg:col-span-1 space-y-6">
          {/* Dane zamówienia */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Szczegóły zamówienia
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Płatność</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={splitPayment}
                      onChange={() => setSplitPayment((v) => !v)}
                      id="splitPayment"
                    />
                    <label htmlFor="splitPayment" className="text-gray-300 text-sm">
                      Płatność podzielona
                    </label>
                  </div>
                  {!splitPayment ? (
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="cash">Gotówka</option>
                      <option value="card">Karta</option>
                      <option value="blik_numer">BLIK na numer</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            value={p.method}
                            onChange={(e) => {
                              const newPayments = [...payments];
                              newPayments[idx].method = e.target.value;
                              setPayments(newPayments);
                            }}
                            className="bg-gray-700 text-white rounded-lg px-2 py-1"
                          >
                            <option value="cash">Gotówka</option>
                            <option value="card">Karta</option>
                            <option value="blik_numer">BLIK na numer</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Kwota"
                            value={p.amount}
                            onChange={(e) => {
                              const newPayments = [...payments];
                              newPayments[idx].amount = e.target.value;
                              setPayments(newPayments);
                            }}
                            className="bg-gray-700 text-white rounded-lg px-2 py-1 w-24"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">
                    Typ zamówienia
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="naMiejscu">Na miejscu</option>
                    <option value="naWynos">Na wynos</option>
                    <option value="dostawa">Dostawa</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Koszyk */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Koszyk</h3>
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {item.name}
                        {item.meat && (
                          <span className="text-gray-400 ml-2">
                            (
                            {item.meat === "smash90"
                              ? "Smash 90g"
                              : item.meat === "beef"
                              ? "Wołowina"
                              : "Kurczak"}
                            )
                          </span>
                        )}
                        {item.size && (
                          <span className="text-gray-400 ml-2">
                            (Rozmiar {item.size})
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">
                        {item.qty} x {(item.price || 0).toFixed(2)} zł
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-semibold">
                        {((item.qty || 0) * (item.price || 0)).toFixed(2)} zł
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Suma:</span>
                    <span className="text-white font-bold text-lg">
                      {(
                        items.reduce(
                          (sum, item) =>
                            sum + (item.price || 0) * (item.qty || 0),
                          0
                        ) +
                        takeawayPackages * 1 +
                        (orderType === "dostawa" ? deliveryFee : 0) -
                        discount
                      ).toFixed(2)}{" "}
                      zł
                    </span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Utwórz zamówienie
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                Dodaj produkty do koszyka
              </p>
            )}
          </div>

          {/* Zniżka */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <label className="block text-gray-300 mb-1">Zniżka (zł)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Opakowania na wynos */}
          {(orderType === "naWynos" || orderType === "dostawa") && (
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <label className="block text-gray-300 mb-1">Opakowania na wynos (1 zł/szt.)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={takeawayPackages}
                onChange={(e) => setTakeawayPackages(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Opłata za dostawę */}
          {orderType === "dostawa" && (
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <label className="block text-gray-300 mb-1">Opłata za dostawę (zł)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Prawa kolumna - Lista produktów */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Produkty</h3>

            {/* Kategorie produktów */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setActiveCategory("burger")}
                className={`px-4 py-2 rounded-lg ${
                  activeCategory === "burger"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Burgery
              </button>
              <button
                onClick={() => setActiveCategory("ufo")}
                className={`px-4 py-2 rounded-lg ${
                  activeCategory === "ufo"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                UFO Burgery
              </button>
              <button
                onClick={() => setActiveCategory("extra")}
                className={`px-4 py-2 rounded-lg ${
                  activeCategory === "extra"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Dodatki
              </button>
              <button
                onClick={() => setActiveCategory("drink")}
                className={`px-4 py-2 rounded-lg ${
                  activeCategory === "drink"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Napoje
              </button>
            </div>

            {/* Lista produktów */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.name}
                  className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    if (prod.category === "burger") {
                      setConfiguring(prod.name);
                    } else if (prod.prices && Object.keys(prod.prices).length > 1) {
                      setConfiguring(prod.name);
                    } else {
                      addItem(prod);
                    }
                  }}
                >
                  <h3 className="text-white font-semibold mb-2">{prod.name}</h3>
                  {prod.category === "burger" ? (
                    <p className="text-gray-400 text-sm">
                      Wybierz rodzaj mięsa
                    </p>
                  ) : (
                    <p className="text-white font-medium">
                      {prod.prices
                        ? prod.prices["0.5l"] !== undefined ||
                          prod.prices["1l"] !== undefined
                          ? `${
                              prod.prices["0.5l"] !== undefined
                                ? prod.prices["0.5l"].toFixed(2)
                                : ""
                            } zł${
                              prod.prices["1l"] !== undefined
                                ? ` - ${prod.prices["1l"].toFixed(2)} zł`
                                : ""
                            }`
                          : prod.prices["M"] !== undefined &&
                            prod.prices["L"] !== undefined
                          ? `${prod.prices["M"].toFixed(2)} zł - ${prod.prices[
                              "L"
                            ].toFixed(2)} zł`
                          : "Cena niedostępna"
                        : prod.price
                        ? `${prod.price.toFixed(2)} zł`
                        : "Cena niedostępna"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal wyboru mięsa/rozmiaru */}
      {configuring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">
              {products.find((p) => p.name === configuring)?.category ===
              "burger"
                ? "Wybierz rodzaj mięsa"
                : "Wybierz rozmiar"}
            </h3>
            <div className="space-y-2">
              {products.find((p) => p.name === configuring)?.category ===
              "burger" ? (
                products
                  .find((p) => p.name === configuring)
                  ?.availableMeats.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        addItem(
                          products.find((p) => p.name === configuring),
                          m
                        );
                        setConfiguring(null);
                      }}
                      className="w-full text-left bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex justify-between items-center"
                    >
                      <span>
                        {m === "smash90"
                          ? "Smash 90g"
                          : m === "beef"
                          ? "Wołowina"
                          : "Kurczak"}
                      </span>
                      <span className="font-semibold">
                        {products
                          .find((p) => p.name === configuring)
                          ?.prices[m].toFixed(2)}{" "}
                        zł
                      </span>
                    </button>
                  ))
              ) : (
                Object.keys(
                  products.find((p) => p.name === configuring)?.prices || {}
                ).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      addItem(products.find((p) => p.name === configuring));
                      setConfiguring(null);
                    }}
                    className="w-full text-left bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex justify-between items-center"
                  >
                    <span>{size}</span>
                    <span className="font-semibold">
                      {products
                        .find((p) => p.name === configuring)
                        ?.prices[size].toFixed(2)}{" "}
                      zł
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setConfiguring(null)}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
