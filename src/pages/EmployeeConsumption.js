import React, { useState, useEffect } from "react";
import burgers from "../data/burgers";
import extras from "../data/extras";
import drinks from "../data/drinks";
import ufoBurgers from "../data/ufo-burgers";
import { clientDb } from "../firebaseClientConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { useDaySession } from "../contexts/DaySessionContext";

const products = [
  ...burgers.map((b) => ({ ...b, category: "burger" })),
  ...extras.map((e) => ({ ...e, category: "extra", price: e.price })),
  ...drinks.map((d) => ({ ...d, category: "drink" })),
  ...ufoBurgers.map((u) => ({ ...u, category: "ufo", price: u.price })),
];

export default function EmployeeConsumption() {
  const [employeeName, setEmployeeName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [consumptionList, setConsumptionList] = useState([]);
  const [activeCategory, setActiveCategory] = useState("burger");
  const { selectedDate } = useDaySession();

  useEffect(() => {
    const consumptionRef = collection(clientDb, "employeeConsumption");
    const unsubscribe = onSnapshot(consumptionRef, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.sessionDay === selectedDate);
      setConsumptionList(data);
    });
    return () => unsubscribe();
  }, [selectedDate]);

  const handleSubmit = async () => {
    if (!employeeName.trim()) {
      return alert("Wpisz imię pracownika");
    }
    if (!selectedProduct) {
      return alert("Wybierz produkt");
    }

    const product = products.find((p) => p.name === selectedProduct);
    if (!product) return;

    const consumptionData = {
      employeeName: employeeName.trim(),
      productName: selectedProduct,
      quantity: parseInt(quantity),
      category: product.category,
      timestamp: serverTimestamp(),
      sessionDay: selectedDate,
    };

    try {
      await addDoc(
        collection(clientDb, "employeeConsumption"),
        consumptionData
      );
      setEmployeeName("");
      setSelectedProduct("");
      setQuantity("1");
      alert("Zużycie własne zapisane!");
    } catch (error) {
      console.error("Błąd:", error);
      alert("Wystąpił błąd podczas zapisywania.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten wpis?")) {
      try {
        await deleteDoc(doc(clientDb, "employeeConsumption", id));
      } catch (error) {
        alert("Błąd podczas usuwania");
      }
    }
  };

  const filteredProducts = products.filter(
    (p) => p.category === activeCategory
  );

  const groupedConsumption = consumptionList.reduce((acc, item) => {
    if (!acc[item.employeeName]) {
      acc[item.employeeName] = [];
    }
    acc[item.employeeName].push(item);
    return acc;
  }, {});

  const resetConsumption = async () => {
    if (window.confirm("Czy na pewno chcesz zresetować zużycie własne dla tego dnia?")) {
      try {
        const consumptionRef = collection(clientDb, "employeeConsumption");
        const snapshot = await getDocs(consumptionRef);
        const batch = writeBatch(clientDb);
        snapshot.docs.forEach((doc) => {
          if (doc.data().sessionDay === selectedDate) {
            batch.delete(doc.ref);
          }
        });
        await batch.commit();
        alert("Zużycie własne zostało zresetowane.");
      } catch (error) {
        alert("Błąd podczas resetowania zużycia własnego.");
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white mb-6">
          Zużycie własne - {selectedDate}
        </h2>
        <button
          onClick={resetConsumption}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded"
        >
          Resetuj zużycie własne
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formularz */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Dodaj zużycie własne
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">
                  Imię pracownika
                </label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="np. Jan"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Kategoria</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {["burger", "ufo", "extra", "drink"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-2 rounded ${
                        activeCategory === cat
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {cat === "burger"
                        ? "Burgery"
                        : cat === "ufo"
                        ? "UFO"
                        : cat === "extra"
                        ? "Dodatki"
                        : "Napoje"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Produkt</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Wybierz produkt</option>
                  {filteredProducts.map((product) => (
                    <option key={product.name} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Ilość</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="1"
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Dodaj zużycie
              </button>
            </div>
          </div>
        </div>

        {/* Lista zużycia */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Dzisiejsze zużycie własne
            </h3>
            {Object.keys(groupedConsumption).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedConsumption).map(([employee, items]) => (
                  <div key={employee} className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">
                      {employee}
                    </h4>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between items-center bg-gray-700 p-2 rounded"
                        >
                          <div className="text-gray-200">
                            <span className="font-medium">
                              {item.productName}
                            </span>
                            <span className="text-gray-400 ml-2">
                              x{item.quantity}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
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
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                Brak zarejestrowanego zużycia własnego na dzisiaj
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
