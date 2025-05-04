import React, { useState, useEffect } from "react";
import { FaSearch, FaPlus, FaMinus, FaTrash } from "react-icons/fa";

export default function WarehouseSnapshotModal({
  type,
  products,
  onSave,
  onClose,
}) {
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    quantity: 0,
    unit: "szt",
  });
  const [quantities, setQuantities] = useState(() => {
    const initial = {};
    products.forEach((p) => {
      initial[p.id] = p.quantity || 0;
    });
    return initial;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [saving, setSaving] = useState(false);
  const [customProducts, setCustomProducts] = useState([]);

  // Get unique categories from products
  const categories = ["all", ...new Set(products.map((p) => p.category))];

  // Filter products based on search term and category
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleChange = (id, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setQuantities((prev) => ({ ...prev, [id]: numValue }));
  };

  const handleIncrement = (id) => {
    setQuantities((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleDecrement = (id) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) - 1),
    }));
  };

  const handleAddProduct = () => {
    if (newProduct.name.trim() === "") return;

    const product = {
      id: `custom-${Date.now()}`,
      name: newProduct.name,
      category: newProduct.category,
      quantity: newProduct.quantity,
      unit: newProduct.unit,
    };

    setCustomProducts([...customProducts, product]);
    setQuantities((prev) => ({ ...prev, [product.id]: product.quantity }));
    setNewProduct({
      name: "",
      category: "",
      quantity: 0,
      unit: "szt",
    });
  };

  const handleRemoveProduct = (id) => {
    setCustomProducts(customProducts.filter((p) => p.id !== id));
    setQuantities((prev) => {
      const newQuantities = { ...prev };
      delete newQuantities[id];
      return newQuantities;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const allProducts = [...products, ...customProducts];
      const snapshot = allProducts.reduce((acc, product) => {
        acc[product.id] = {
          name: product.name,
          category: product.category,
          quantity: quantities[product.id] || 0,
          unit: product.unit,
        };
        return acc;
      }, {});
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

        {/* Add new product form */}
        <div className="bg-gray-700 rounded-lg p-8 mb-8">
          <h3 className="text-white font-medium mb-4">Dodaj nowy produkt</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <input
              type="text"
              placeholder="Nazwa produktu"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
              className="bg-gray-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-500"
            />
            <input
              type="text"
              placeholder="Kategoria"
              value={newProduct.category}
              onChange={(e) =>
                setNewProduct({ ...newProduct, category: e.target.value })
              }
              className="bg-gray-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-500"
            />
            <input
              type="number"
              min={0}
              placeholder="Ilość"
              value={newProduct.quantity}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  quantity: parseInt(e.target.value) || 0,
                })
              }
              className="bg-gray-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-500"
            />
            <select
              value={newProduct.unit}
              onChange={(e) =>
                setNewProduct({ ...newProduct, unit: e.target.value })
              }
              className="bg-gray-600 text-white px-6 pr-12 py-3 rounded-xl min-w-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-500"
            >
              <option value="szt">szt</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddProduct}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-base font-semibold"
          >
            Dodaj produkt
          </button>
        </div>

        {/* Search and filter controls */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Szukaj produktu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg pl-10"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-700 text-white px-6 pr-12 py-2 rounded-xl min-w-[160px] mx-2 my-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "Wszystkie kategorie" : category}
              </option>
            ))}
          </select>
        </div>

        {/* Products list */}
        <div className="space-y-4 mb-8">
          {[...filteredProducts, ...customProducts].map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 bg-gray-700 rounded-lg px-4 py-3"
            >
              <div className="flex-1">
                <div className="text-white font-medium">{p.name}</div>
                {p.category && (
                  <div className="text-sm text-gray-400">{p.category}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDecrement(p.id)}
                  className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded"
                >
                  <FaMinus />
                </button>
                <input
                  type="number"
                  min={0}
                  className="w-24 bg-gray-900 text-white px-2 py-1 rounded text-lg text-center"
                  value={quantities[p.id]}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => handleIncrement(p.id)}
                  className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded"
                >
                  <FaPlus />
                </button>
              </div>
              <span className="text-gray-300 text-lg">{p.unit || "szt"}</span>
              {p.id.startsWith("custom-") && (
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(p.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-lg"
            onClick={onClose}
            disabled={saving}
          >
            Anuluj
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-lg font-bold disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Zapisywanie..." : "Zapisz"}
          </button>
        </div>
      </form>
    </div>
  );
}
