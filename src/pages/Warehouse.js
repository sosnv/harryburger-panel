import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import { useUser } from "../contexts/UserContext";
import { useDaySession } from "../contexts/DaySessionContext";
import {
  FaSearch,
  FaPlus,
  FaFilter,
  FaHistory,
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaFileExport,
  FaSort,
  FaPlusCircle,
  FaMinusCircle,
  FaComment,
  FaLock,
} from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function Warehouse() {
  const { isManager } = useUser();
  const { selectedDate } = useDaySession();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [reportComment, setReportComment] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    currentStock: 0,
    minStock: 0,
    unit: "szt",
    price: 0,
    isAvailable: true,
  });
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [activeSnapshotType, setActiveSnapshotType] = useState("start");

  const filterProducts = useCallback(() => {
    let filtered = products;

    if (!showUnavailable) {
      filtered = filtered.filter((product) => product.isAvailable);
    }

    if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    // Sortowanie
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortOption) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "stock":
          comparison = a.currentStock - b.currentStock;
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredProducts(filtered);
  }, [
    products,
    searchTerm,
    selectedCategory,
    sortOption,
    sortDirection,
    showUnavailable,
  ]);

  useEffect(() => {
    const q = query(collection(clientDb, "warehouse"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const productsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            // Ensure all required fields have default values
            name: doc.data().name || "Brak nazwy",
            category: doc.data().category || "inne",
            currentStock: doc.data().currentStock || 0,
            minStock: doc.data().minStock || 0,
            unit: doc.data().unit || "szt",
            price: doc.data().price || 0,
            isAvailable:
              doc.data().isAvailable !== undefined
                ? doc.data().isAvailable
                : true,
            history: doc.data().history || [],
          }));
          setProducts(productsData);
          setIsLoading(false);
        } catch (error) {
          console.error("Error processing products data:", error);
          toast.error("Błąd podczas przetwarzania danych");
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Error fetching products:", error);
        toast.error("Błąd podczas pobierania danych z bazy");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  useEffect(() => {
    async function fetchSnapshots() {
      setSnapshotsLoading(true);
      const snapQ = collection(clientDb, "dailyWarehouseReports");
      const snapDocs = await getDocs(snapQ);
      const filtered = snapDocs.docs
        .map((doc) => doc.data())
        .filter((snap) => snap.sessionDay === selectedDate);
      setSnapshots(filtered);
      setSnapshotsLoading(false);
    }
    fetchSnapshots();
  }, [selectedDate]);

  const validateProduct = (product) => {
    if (!product.name.trim()) {
      toast.error("Nazwa produktu jest wymagana");
      return false;
    }
    if (!product.category) {
      toast.error("Kategoria jest wymagana");
      return false;
    }
    if (product.currentStock < 0) {
      toast.error("Stan początkowy nie może być ujemny");
      return false;
    }
    if (product.minStock < 0) {
      toast.error("Minimalny stan nie może być ujemny");
      return false;
    }
    if (product.price < 0) {
      toast.error("Cena nie może być ujemna");
      return false;
    }
    return true;
  };

  const handleAddProduct = async () => {
    if (!validateProduct(newProduct)) return;

    try {
      setIsLoading(true);
      await addDoc(collection(clientDb, "warehouse"), {
        ...newProduct,
        createdAt: serverTimestamp(),
        history: [
          {
            type: "initial",
            quantity: newProduct.currentStock,
            timestamp: serverTimestamp(),
          },
        ],
      });
      setShowAddModal(false);
      setNewProduct({
        name: "",
        category: "",
        currentStock: 0,
        minStock: 0,
        unit: "szt",
        price: 0,
        isAvailable: true,
      });
      toast.success("Produkt dodany pomyślnie");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Błąd podczas dodawania produktu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStock = async (productId, newStock) => {
    const stockValue = parseInt(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
      toast.error("Nieprawidłowa wartość stanu magazynowego");
      return;
    }

    try {
      setIsLoading(true);
      const productRef = doc(clientDb, "warehouse", productId);
      const product = products.find((p) => p.id === productId);

      await updateDoc(productRef, {
        currentStock: stockValue,
        history: [
          ...(product.history || []),
          {
            type: "update",
            quantity: stockValue,
            timestamp: serverTimestamp(),
            updatedBy: "manager",
          },
        ],
      });
      toast.success("Stan magazynowy zaktualizowany");
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Błąd podczas aktualizacji stanu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickUpdate = async (productId, change) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newStock = product.currentStock + change;
    if (newStock < 0) {
      toast.error("Stan magazynowy nie może być ujemny");
      return;
    }

    await handleUpdateStock(productId, newStock);
  };

  const handleReportLowStock = async () => {
    if (!selectedProduct) return;

    try {
      setIsLoading(true);
      await addDoc(collection(clientDb, "lowStockReports"), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        currentStock: selectedProduct.currentStock,
        minStock: selectedProduct.minStock,
        comment: reportComment,
        reportedBy: "employee",
        timestamp: serverTimestamp(),
        status: "pending",
      });
      setShowReportModal(false);
      setReportComment("");
      toast.success("Zgłoszenie zostało wysłane");
    } catch (error) {
      console.error("Error reporting low stock:", error);
      toast.error("Błąd podczas wysyłania zgłoszenia");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Nazwa",
      "Kategoria",
      "Stan",
      "Min. stan",
      "Cena",
      "Jednostka",
      "Dostępność",
    ];
    const data = filteredProducts.map((product) => [
      product.name,
      product.category,
      product.currentStock,
      product.minStock,
      product.price.toFixed(2),
      product.unit,
      product.isAvailable ? "Tak" : "Nie",
    ]);

    const csvContent = [
      headers.join(","),
      ...data.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `stan_magazynowy_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Czy na pewno chcesz usunąć ten produkt?")) return;

    try {
      setIsLoading(true);
      const productRef = doc(clientDb, "warehouse", productId);
      await updateDoc(productRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      });
      toast.success("Produkt usunięty");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Błąd podczas usuwania produktu");
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    "all",
    "mięso",
    "warzywa",
    "napoje",
    "dodatki",
    "sosy",
    "inne",
  ];

  // Wybierz snapshot do wyświetlenia na podstawie aktywnego typu
  const selectedSnapshot = React.useMemo(() => {
    if (snapshots.length === 0) return null;
    const snap = snapshots.find((s) => s.type === activeSnapshotType);
    if (snap) return snap;
    // fallback: jeśli nie ma wybranego typu, pokaż inny dostępny
    return snapshots[0] || null;
  }, [snapshots, activeSnapshotType]);

  // Przygotuj produkty do wyświetlenia w tabeli na podstawie snapshotu
  const snapshotProducts = selectedSnapshot
    ? Object.values(selectedSnapshot.snapshot)
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Data stanu magazynowego na górze */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <span className="text-lg font-semibold text-blue-400">
          Stan magazynowy na dzień: {selectedDate}
        </span>
        {selectedSnapshot && selectedSnapshot.timestamp && (
          <span className="text-gray-400 text-sm ml-4">
            {selectedSnapshot.type === "end"
              ? "Stan na koniec dnia"
              : "Stan na początek dnia"}{" "}
            &middot; {selectedSnapshot.timestamp.toDate().toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Stan magazynowy</h1>
        <div className="flex gap-4 items-center">
          {/* Snapshot toggle buttons */}
          <button
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeSnapshotType === "start"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-blue-800"
            }`}
            disabled={!snapshots.some((s) => s.type === "start")}
            onClick={() => setActiveSnapshotType("start")}
          >
            Stan początkowy
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeSnapshotType === "end"
                ? "bg-green-600 text-white"
                : snapshots.some((s) => s.type === "end")
                ? "bg-gray-700 text-gray-300 hover:bg-green-800"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!snapshots.some((s) => s.type === "end")}
            onClick={() => setActiveSnapshotType("end")}
          >
            {!snapshots.some((s) => s.type === "end") && (
              <FaLock className="mr-1" />
            )}
            Stan końcowy
          </button>
          <button
            onClick={handleExport}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaFileExport /> Eksportuj
          </button>
          {isManager && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              disabled={isLoading}
            >
              <FaPlus /> Dodaj produkt
            </button>
          )}
        </div>
      </div>

      {/* Filtry i sortowanie nad tabelą snapshotu */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Szukaj produktu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg pl-10 text-lg"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg text-lg"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "all" ? "Wszystkie kategorie" : category}
            </option>
          ))}
        </select>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg text-lg"
        >
          <option value="name">Sortuj po nazwie</option>
          <option value="stock">Sortuj po stanie</option>
          <option value="price">Sortuj po cenie</option>
        </select>
        <button
          onClick={() =>
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
          }
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-lg"
        >
          <FaSort className={sortDirection === "asc" ? "rotate-180" : ""} />
        </button>
      </div>
      {/* Tabela snapshotu */}
      {snapshotsLoading ? (
        <div className="text-gray-400 mb-8">Ładowanie...</div>
      ) : !selectedSnapshot ? (
        <div className="text-gray-500 italic mb-8">
          Brak zapisanego stanu magazynowego dla wybranego dnia.
        </div>
      ) : (
        <>
          <table className="w-full text-base text-gray-300 bg-[#23232a] rounded-lg overflow-hidden shadow-lg mb-4">
            <thead>
              <tr className="bg-[#23232a]">
                <th className="px-3 py-2 text-left font-bold text-white">
                  Produkt
                </th>
                <th className="px-3 py-2 text-left font-bold text-white">
                  Ilość
                </th>
                <th className="px-3 py-2 text-left font-bold text-white">
                  Jednostka
                </th>
                <th className="px-3 py-2 text-center font-bold text-white">
                  Stan
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshotProducts
                .filter(
                  (prod) =>
                    (!searchTerm ||
                      prod.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())) &&
                    (selectedCategory === "all" ||
                      prod.category === selectedCategory)
                )
                .sort((a, b) => {
                  let comparison = 0;
                  switch (sortOption) {
                    case "name":
                      comparison = a.name.localeCompare(b.name);
                      break;
                    case "stock":
                      comparison = a.quantity - b.quantity;
                      break;
                    default:
                      comparison = 0;
                  }
                  return sortDirection === "asc" ? comparison : -comparison;
                })
                .map((prod, i) => {
                  const minStock = prod.minStock ?? 1;
                  let diodeColor = "bg-green-500";
                  if (prod.quantity === 0) {
                    diodeColor = "bg-red-500";
                  } else if (prod.quantity <= 2 * minStock) {
                    diodeColor = "bg-yellow-400";
                  }
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-700 last:border-0 hover:bg-[#222228] transition"
                    >
                      <td className="px-3 py-2 font-semibold text-white">
                        {prod.name}
                      </td>
                      <td className="px-3 py-2 font-bold text-blue-400">
                        {prod.quantity}
                      </td>
                      <td className="px-3 py-2">{prod.unit}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block w-5 h-5 rounded-full ${diodeColor} border-2 border-gray-700`}
                        ></span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {/* Legenda diod */}
          <div className="flex items-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full bg-green-500 border-2 border-gray-700"></span>
              <span className="text-gray-300 text-sm">Dużo zapasu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full bg-yellow-400 border-2 border-gray-700"></span>
              <span className="text-gray-300 text-sm">Resztki</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full bg-red-500 border-2 border-gray-700"></span>
              <span className="text-gray-300 text-sm">Brak</span>
            </div>
          </div>
        </>
      )}

      {/* Filtry i wyszukiwarka */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={showUnavailable}
            onChange={(e) => setShowUnavailable(e.target.checked)}
            className="rounded"
          />
          Pokaż niedostępne
        </label>
      </div>

      {/* Lista produktów */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className={`bg-gray-800 p-4 rounded-lg ${
              product.currentStock <= product.minStock
                ? "border-2 border-red-500"
                : ""
            } ${!product.isAvailable ? "opacity-50" : ""}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {product.name}
                </h3>
                <p className="text-gray-400">{product.category}</p>
              </div>
              <div className="flex gap-2">
                {product.currentStock <= product.minStock && (
                  <FaExclamationTriangle className="text-red-500" />
                )}
                {isManager && (
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Stan:</span>
                <div className="flex items-center gap-2">
                  {isManager && (
                    <>
                      <button
                        onClick={() => handleQuickUpdate(product.id, -1)}
                        className="text-gray-400 hover:text-white"
                      >
                        <FaMinusCircle />
                      </button>
                      <span
                        className={`font-semibold ${
                          product.currentStock <= product.minStock
                            ? "text-red-500"
                            : "text-white"
                        }`}
                      >
                        {product.currentStock}
                      </span>
                      <button
                        onClick={() => handleQuickUpdate(product.id, 1)}
                        className="text-gray-400 hover:text-white"
                      >
                        <FaPlusCircle />
                      </button>
                    </>
                  )}
                  {!isManager && (
                    <span
                      className={`font-semibold ${
                        product.currentStock <= product.minStock
                          ? "text-red-500"
                          : "text-white"
                      }`}
                    >
                      {product.currentStock}
                    </span>
                  )}
                  <span className="text-gray-400 ml-1">{product.unit}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Min. stan:</span>
                <span className="text-white">
                  {product.minStock} {product.unit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Cena:</span>
                <span className="text-white">
                  {product.price.toFixed(2)} zł
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setSelectedProduct(product);
                  setShowHistoryModal(true);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
              >
                <FaHistory className="inline mr-1" /> Historia
              </button>
              {isManager ? (
                <button
                  onClick={() => {
                    const newStock = prompt(
                      "Podaj nowy stan magazynowy:",
                      product.currentStock
                    );
                    if (newStock !== null) {
                      handleUpdateStock(product.id, newStock);
                    }
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  <FaEdit className="inline mr-1" /> Aktualizuj
                </button>
              ) : (
                product.currentStock <= product.minStock && (
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowReportModal(true);
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    <FaComment className="inline mr-1" /> Zgłoś brak
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal dodawania produktu */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              Dodaj nowy produkt
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1">Nazwa</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Kategoria</label>
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  required
                >
                  <option value="">Wybierz kategorię</option>
                  {categories
                    .filter((cat) => cat !== "all")
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">
                  Stan początkowy
                </label>
                <input
                  type="number"
                  min="0"
                  value={newProduct.currentStock}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      currentStock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">
                  Minimalny stan
                </label>
                <input
                  type="number"
                  min="0"
                  value={newProduct.minStock}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      minStock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Jednostka</label>
                <input
                  type="text"
                  value={newProduct.unit}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, unit: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Cena</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newProduct.isAvailable}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      isAvailable: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <label className="text-gray-400">Produkt dostępny</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                disabled={isLoading}
              >
                Anuluj
              </button>
              <button
                onClick={handleAddProduct}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                disabled={isLoading}
              >
                {isLoading ? "Dodawanie..." : "Dodaj"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historii */}
      {showHistoryModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              Historia: {selectedProduct.name}
            </h2>
            <div className="max-h-96 overflow-y-auto">
              {selectedProduct.history?.map((entry, index) => (
                <div
                  key={index}
                  className="border-b border-gray-700 py-2 last:border-0"
                >
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {entry.type === "initial"
                        ? "Stan początkowy"
                        : "Aktualizacja stanu"}
                    </span>
                    <span className="text-white">
                      {entry.quantity} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.timestamp?.toDate().toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedProduct(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal zgłoszenia braku */}
      {showReportModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              Zgłoś niski stan: {selectedProduct.name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1">Komentarz</label>
                <textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  rows="3"
                  placeholder="Dodaj komentarz (opcjonalnie)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedProduct(null);
                  setReportComment("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Anuluj
              </button>
              <button
                onClick={handleReportLowStock}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                disabled={isLoading}
              >
                {isLoading ? "Wysyłanie..." : "Wyślij zgłoszenie"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
