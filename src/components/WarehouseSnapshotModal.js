import React, { useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";
import { warehouseProducts } from "../data/warehouseProducts";

export default function WarehouseSnapshotModal({ type, onSave, onClose }) {
  // Tworzymy mapę ilości na podstawie warehouseProducts
  const [quantities, setQuantities] = useState(() => {
    const initial = {};
    warehouseProducts.forEach((p) => {
      initial[p.name] = 0;
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Kategorie do filtrowania
  const categories = [
    "all",
    ...Array.from(new Set(warehouseProducts.map((p) => p.category))),
  ];

  // Filtrowanie produktów
  const filteredProducts = warehouseProducts.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleChange = (name, value) => {
    // Usuwamy wiodące zera i nie pozwalamy na puste pole (ustawiamy 0)
    let numValue = value.replace(/^0+(?!$)/, "");
    if (numValue === "") numValue = "0";
    numValue = Math.max(0, parseInt(numValue) || 0);
    setQuantities((prev) => ({ ...prev, [name]: numValue }));
  };

  const handleIncrement = (name) => {
    setQuantities((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  };

  const handleDecrement = (name) => {
    setQuantities((prev) => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) - 1),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Tworzymy snapshot w formacie zgodnym z backendem
      const snapshot = {};
      warehouseProducts.forEach((p) => {
        snapshot[p.name] = {
          name: p.name,
          category: p.category,
          quantity: quantities[p.name] || 0,
          unit: p.unit,
        };
      });
      await onSave(snapshot);
    } catch (error) {
      console.error("Error saving warehouse snapshot:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {type === "start"
            ? "Stan magazynowy na początek dnia"
            : "Stan magazynowy na koniec dnia"}
        </h2>
        {/* Filtry */}
        <div className="flex gap-4 mb-6 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Szukaj produktu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg pl-10"
              style={{ height: "44px" }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-700 text-white px-6 pr-12 py-2 rounded-xl min-w-[160px] mx-2 my-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            style={{ height: "44px" }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "Wszystkie kategorie" : category}
              </option>
            ))}
          </select>
        </div>
        {/* Lista produktów */}
        <div className="mb-8">
          <div className="grid grid-cols-[1.5fr_60px_80px_60px_1fr] gap-y-2">
            {filteredProducts.map((p) => (
              <React.Fragment key={p.name}>
                <div className="flex flex-col justify-center min-h-[48px]">
                  <div className="text-white font-medium leading-tight">
                    {p.name}
                  </div>
                  {p.category && (
                    <div className="text-sm text-gray-400 leading-tight">
                      {p.category}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDecrement(p.name)}
                  className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded w-10 mx-auto"
                >
                  <FaMinus />
                </button>
                <input
                  type="number"
                  min={0}
                  className="w-20 bg-gray-900 text-white px-2 py-1 rounded text-lg text-center mx-auto"
                  value={quantities[p.name]}
                  onChange={(e) => handleChange(p.name, e.target.value)}
                  required
                  style={{ textAlign: "center" }}
                />
                <button
                  type="button"
                  onClick={() => handleIncrement(p.name)}
                  className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded w-10 mx-auto"
                >
                  <FaPlus />
                </button>
                <span className="text-gray-300 text-lg text-left ml-2">
                  {p.unit || "szt"}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
            disabled={saving}
          >
            Anuluj
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            disabled={saving}
          >
            {saving ? "Zapisywanie..." : "Zapisz stan"}
          </button>
        </div>
      </form>
    </div>
  );
}
