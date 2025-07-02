import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { clientDb } from "../firebaseClientConfig";
import WarehouseStockTile from "../components/WarehouseStockTile";
import { useDaySession } from "../contexts/DaySessionContext";
import WarehouseSnapshotModal from "../components/WarehouseSnapshotModal";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FaLock } from "react-icons/fa";
import burgers from "../data/burgers";
import extras from "../data/extras";
import drinks from "../data/drinks";
import ufoBurgers from "../data/ufo-burgers";

// Funkcja zamieniająca polskie znaki na łacińskie odpowiedniki
function removePolishChars(str) {
  if (!str) return str;
  return str
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/Ą/g, "A")
    .replace(/Ć/g, "C")
    .replace(/Ę/g, "E")
    .replace(/Ł/g, "L")
    .replace(/Ń/g, "N")
    .replace(/Ó/g, "O")
    .replace(/Ś/g, "S")
    .replace(/Ź/g, "Z")
    .replace(/Ż/g, "Z");
}

// Helper to remove Polish chars and replace 'zł' with 'zl'
function cleanText(str) {
  if (!str) return str;
  return removePolishChars(str).replace(/zł/g, "zl").replace(/ZŁ/g, "ZL");
}

export default function Dashboard() {
  const [aktywnych, setAktywnych] = useState(0);
  const [zakonczonych, setZakonczonych] = useState(0);
  const {
    isDayStarted,
    loading: daySessionLoading,
    selectedDate,
    refreshSessionStatus,
    isDayEnded,
    setIsDayEnded,
  } = useDaySession();
  const [loading, setLoading] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotType, setSnapshotType] = useState("start");
  const [warehouseProducts, setWarehouseProducts] = useState([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [hasEndSnapshot, setHasEndSnapshot] = useState(false);

  useEffect(() => {
    const ordersRef = collection(clientDb, "orders");
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data());
      const activeCount = docs.filter(
        (d) =>
          !d.isArchived &&
          (d.sessionDay === selectedDate ||
            (!d.sessionDay &&
              d.timestamp &&
              d.timestamp.toDate().toISOString().split("T")[0] === selectedDate))
      ).length;
      const completedCount = docs.filter((d) => d.isArchived).length;
      setAktywnych(activeCount);
      setZakonczonych(completedCount);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkEndSnapshot = async () => {
      if (isDayEnded) {
        const snapQ = collection(clientDb, "dailyWarehouseReports");
        const snapDocs = await getDocs(snapQ);
        const found = snapDocs.docs
          .map((doc) => doc.data())
          .find(
            (snap) => snap.sessionDay === selectedDate && snap.type === "end"
          );
        setHasEndSnapshot(!!found);
      }
    };
    checkEndSnapshot();
  }, [isDayEnded, selectedDate]);

  // Rozpocznij dzień i otwórz modal snapshotu
  const handleStartDay = async () => {
    setLoading(true);
    try {
      const sessionRef = doc(
        collection(clientDb, "dailySessions"),
        selectedDate
      );
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        await updateDoc(sessionRef, {
          isDayStarted: true,
          isDayEnded: false,
          startedAt: serverTimestamp(),
        });
      } else {
        await setDoc(sessionRef, {
          isDayStarted: true,
          isDayEnded: false,
          startedAt: serverTimestamp(),
        });
      }
      toast.success("Dzień rozpoczęty!");
      // Pobierz produkty i pokaż modal
      const snapshot = await getDocs(collection(clientDb, "warehouse"));
      setWarehouseProducts(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setShowSnapshotModal(true);
    } catch (err) {
      toast.error("Błąd podczas rozpoczynania dnia");
    } finally {
      setLoading(false);
    }
  };

  // Zapisz snapshot magazynu
  const handleSaveSnapshot = async (snapshotData) => {
    setLoading(true);
    try {
      await setDoc(doc(collection(clientDb, "dailyWarehouseReports")), {
        sessionDay: selectedDate,
        type: snapshotType,
        snapshot: snapshotData,
        timestamp: serverTimestamp(),
      });
      toast.success("Stan magazynowy zapisany!");
      setShowSnapshotModal(false);
      await refreshSessionStatus();
    } catch (err) {
      toast.error("Błąd podczas zapisywania stanu magazynowego");
    } finally {
      setLoading(false);
    }
  };

  // Zamknij dzień
  const handleEndDay = async () => {
    if (aktywnych > 0) {
      toast.error("Nie można zamknąć dnia z aktywnymi zamówieniami!");
      return;
    }
    setLoading(true);
    try {
      const sessionRef = doc(clientDb, "dailySessions", selectedDate);
      await updateDoc(sessionRef, {
        isDayEnded: true,
        endedAt: serverTimestamp(),
      });
      await refreshSessionStatus();
      toast.success("Dzień został zamknięty!");

      // Pobierz produkty i pokaż modal końcowego stanu magazynowego
      const snapshot = await getDocs(collection(clientDb, "warehouse"));
      setWarehouseProducts(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setSnapshotType("end");
      setShowSnapshotModal(true);
    } catch (err) {
      toast.error("Błąd podczas zamykania dnia: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // PDF generation handler
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Fetch warehouse snapshots (start/end)
      const snapQ = collection(clientDb, "dailyWarehouseReports");
      const snapDocs = await getDocs(snapQ);
      const snapshots = snapDocs.docs
        .map((doc) => doc.data())
        .filter((snap) => snap.sessionDay === selectedDate);
      const startSnap = snapshots.find((s) => s.type === "start");
      const endSnap = snapshots.find((s) => s.type === "end");

      // Fetch orders for the day
      const ordersQ = collection(clientDb, "orders");
      const ordersDocs = await getDocs(ordersQ);
      const orders = ordersDocs.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((order) => {
          if (order.sessionDay) return order.sessionDay === selectedDate;
          if (!order.timestamp || !order.timestamp.toDate) return false;
          const date = order.timestamp.toDate().toISOString().split("T")[0];
          return date === selectedDate;
        });
      console.log("Orders for PDF:", orders);
      if (!orders.length) {
        toast.error("Brak zamówień do podsumowania dla wybranego dnia!");
        setGeneratingPDF(false);
        return;
      }

      // Calculate sales summary by category
      const categorySales = {
        burger: { quantity: 0, revenue: 0 },
        ufo: { quantity: 0, revenue: 0 },
        extra: { quantity: 0, revenue: 0 },
        drink: { quantity: 0, revenue: 0 },
      };

      // Calculate payment methods summary
      const paymentMethods = {
        cash: 0,
        card: 0,
        blik: 0,
      };

      // Calculate total revenue
      let totalRevenue = 0;

      // Calculate product sales
      const salesSummary = {};

      orders.forEach((order) => {
        if (!order.items) return;

        // Calculate order total
        const orderTotal = order.items.reduce(
          (sum, item) => sum + (item.price || 0) * (item.qty || 0),
          0
        );

        // Add to payment method
        if (order.paymentMethod === "cash") {
          paymentMethods.cash += orderTotal;
        } else if (order.paymentMethod === "card") {
          paymentMethods.card += orderTotal;
        } else if (order.paymentMethod === "blik") {
          paymentMethods.blik += orderTotal;
        }

        // Process items
        order.items.forEach((item) => {
          if (!item.name || !item.qty || !item.price) return;

          // Add to product sales summary
          if (!salesSummary[item.name]) {
            salesSummary[item.name] = {
              quantity: 0,
              revenue: 0,
              unit: item.unit || "szt",
              category: item.category,
            };
          }
          salesSummary[item.name].quantity += item.qty;
          salesSummary[item.name].revenue += item.price * item.qty;

          // Add to category sales
          const category = getItemCategory(item.name);
          if (categorySales[category]) {
            categorySales[category].quantity += item.qty;
            categorySales[category].revenue += item.price * item.qty;
          }

          // Add to total revenue
          totalRevenue += item.price * item.qty;
        });
      });

      // Helper function to determine item category
      function getItemCategory(itemName) {
        // Find the product in our products array
        const product = [...burgers, ...extras, ...drinks, ...ufoBurgers].find(
          (p) => p.name === itemName
        );

        if (!product) return "other";

        if (burgers.some((b) => b.name === itemName)) return "burger";
        if (ufoBurgers.some((b) => b.name === itemName)) return "ufo";
        if (extras.some((e) => e.name === itemName)) return "extra";
        if (drinks.some((d) => d.name === itemName)) return "drink";

        return "other";
      }

      // Helper function to format units
      function formatUnit(quantity, unit) {
        if (!unit) return `${quantity}`;
        const unitMap = {
          szt: "szt.",
          kg: "kg",
          l: "l",
          g: "g",
          ml: "ml",
          op: "op.",
          paczka: "op.",
          paczki: "op.",
          sztuki: "szt.",
          sztuka: "szt.",
          litr: "l",
          litry: "l",
          gram: "g",
          gramy: "g",
          mililitr: "ml",
          mililitry: "ml",
        };
        const standardizedUnit = unitMap[unit.toLowerCase()] || unit;
        if (standardizedUnit === "kg" || standardizedUnit === "l") {
          return `${quantity.toFixed(2)} ${standardizedUnit}`;
        } else if (standardizedUnit === "g" || standardizedUnit === "ml") {
          if (quantity >= 1000) {
            return `${(quantity / 1000).toFixed(2)} ${
              standardizedUnit === "g" ? "kg" : "l"
            }`;
          }
          return `${Math.round(quantity)} ${standardizedUnit}`;
        }
        return `${Math.round(quantity)} ${standardizedUnit}`;
      }

      // Użyj globalnej wersji jsPDF dostępnej z CDN, jeśli istnieje (na produkcji)
      // W przeciwnym razie użyj lokalnie importowanej wersji (podczas developmentu)
      let doc;
      if (window.jspdf && window.jspdf.jsPDF) {
        // Wersja z CDN (na produkcji)
        doc = new window.jspdf.jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
      } else {
        // Wersja z importu (dla developmentu)
        doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
      }

      // Add font support for Polish characters
      // doc.setFont("DejaVu"); // Usuwam to, bo nie używamy tej czcionki
      doc.setFontSize(20);
      doc.text(cleanText(`Raport dzienny: ${selectedDate}`), 15, 20);

      // 1. Orders Summary
      doc.setFontSize(14);
      doc.text(cleanText("Podsumowanie zamówień"), 15, 35);

      // Total revenue
      doc.setFontSize(12);
      doc.text(
        cleanText(`Końcowa suma zamówień: ${totalRevenue.toFixed(2)} zł`),
        15,
        45
      );

      // Category summary
      doc.setFontSize(12);
      doc.text(cleanText("Suma według kategorii:"), 15, 55);

      const categoryHeaders = [
        cleanText("Kategoria"),
        cleanText("Ilość"),
        cleanText("Wartość"),
      ];
      const categoryRows = [
        [
          cleanText("Burgery"),
          categorySales.burger.quantity.toString(),
          cleanText(`${categorySales.burger.revenue.toFixed(2)} zł`),
        ],
        [
          cleanText("UFO Burgery"),
          categorySales.ufo.quantity.toString(),
          cleanText(`${categorySales.ufo.revenue.toFixed(2)} zł`),
        ],
        [
          cleanText("Dodatki"),
          categorySales.extra.quantity.toString(),
          cleanText(`${categorySales.extra.revenue.toFixed(2)} zł`),
        ],
        [
          cleanText("Napoje"),
          categorySales.drink.quantity.toString(),
          cleanText(`${categorySales.drink.revenue.toFixed(2)} zł`),
        ],
        [cleanText("SUMA"), "", cleanText(`${totalRevenue.toFixed(2)} zł`)],
      ];

      doc.autoTable({
        head: [categoryHeaders],
        body: categoryRows,
        startY: 60,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [64, 64, 64] },
        theme: "grid",
      });

      // Payment methods
      doc.setFontSize(12);
      doc.text(
        cleanText("Metody płatności:"),
        15,
        doc.lastAutoTable.finalY + 15
      );

      const paymentHeaders = [cleanText("Metoda"), cleanText("Wartość")];
      const paymentRows = [
        [
          cleanText("Gotówka"),
          cleanText(`${paymentMethods.cash.toFixed(2)} zł`),
        ],
        [cleanText("Karta"), cleanText(`${paymentMethods.card.toFixed(2)} zł`)],
        [cleanText("BLIK"), cleanText(`${paymentMethods.blik.toFixed(2)} zł`)],
        [
          cleanText("SUMA"),
          cleanText(
            `${(
              paymentMethods.cash +
              paymentMethods.card +
              paymentMethods.blik
            ).toFixed(2)} zł`
          ),
        ],
      ];

      doc.autoTable({
        head: [paymentHeaders],
        body: paymentRows,
        startY: doc.lastAutoTable.finalY + 20,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [64, 64, 64] },
        theme: "grid",
      });

      // 2. Orders List
      doc.setFontSize(14);
      doc.text(cleanText("Lista zamówień"), 15, doc.lastAutoTable.finalY + 15);

      const orderHeaders = [
        cleanText("Nr"),
        cleanText("Godzina"),
        cleanText("Status"),
        cleanText("Wartość"),
        cleanText("Metoda"),
      ];
      const orderRows = orders.map((order, idx) => {
        const orderTotal = order.items
          ? order.items.reduce(
              (sum, item) => sum + (item.price || 0) * (item.qty || 0),
              0
            )
          : 0;
        return [
          (order.orderNumber || idx + 1).toString(),
          order.timestamp?.toDate().toLocaleTimeString() || "",
          cleanText(order.isArchived ? "Zakończone" : "Aktywne"),
          cleanText(orderTotal.toFixed(2) + " zł"),
          cleanText(order.paymentMethod || ""),
        ];
      });

      doc.autoTable({
        head: [orderHeaders],
        body: orderRows,
        startY: doc.lastAutoTable.finalY + 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64] },
        theme: "grid",
      });

      // 3. Warehouse State Comparison
      doc.setFontSize(14);
      doc.text(
        cleanText("Stan magazynowy - porównanie"),
        15,
        doc.lastAutoTable.finalY + 15
      );

      // Combine all products from both snapshots
      const allProducts = new Set();
      for (const productId in startSnap?.snapshot || {}) {
        allProducts.add(productId);
      }
      for (const productId in endSnap?.snapshot || {}) {
        allProducts.add(productId);
      }

      const warehouseHeaders = [
        cleanText("Produkt"),
        cleanText("Stan początkowy"),
        cleanText("Stan końcowy"),
        cleanText("Różnica"),
      ];
      const warehouseRows = Array.from(allProducts).map((productId) => {
        const startProduct = startSnap?.snapshot?.[productId] || {};
        const endProduct = endSnap?.snapshot?.[productId] || {};
        const startQty = startProduct.quantity || 0;
        const endQty = endProduct.quantity || 0;
        const diff = endQty - startQty;
        const unit = startProduct.unit || endProduct.unit || "szt";
        const name = startProduct.name || endProduct.name || productId;
        return [
          cleanText(name),
          cleanText(formatUnit(startQty, unit)),
          cleanText(formatUnit(endQty, unit)),
          cleanText(formatUnit(diff, unit)),
        ];
      });

      doc.autoTable({
        head: [warehouseHeaders],
        body: warehouseRows,
        startY: doc.lastAutoTable.finalY + 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64] },
        theme: "grid",
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 40, halign: "right" },
          2: { cellWidth: 40, halign: "right" },
          3: { cellWidth: 40, halign: "right" },
        },
      });

      // Add a new page if needed
      if (doc.lastAutoTable.finalY > doc.internal.pageSize.height - 40) {
        doc.addPage();
      }

      // 4. Inventory summary - used vs available
      doc.setFontSize(14);
      doc.text(
        cleanText("Podsumowanie magazynu"),
        15,
        doc.lastAutoTable.finalY + 15
      );

      doc.setFontSize(10);
      doc.text(
        cleanText(
          "To zestawienie pokazuje, ile produktów zostało zużytych w stosunku do początkowego stanu magazynu."
        ),
        15,
        doc.lastAutoTable.finalY + 25
      );

      const inventorySummaryHeaders = [
        cleanText("Produkt"),
        cleanText("Początkowy stan"),
        cleanText("Końcowy stan"),
        cleanText("Zużyto"),
        cleanText("% wykorzystania"),
      ];
      const inventorySummaryRows = Array.from(allProducts).map((productId) => {
        const startProduct = startSnap?.snapshot?.[productId] || {};
        const endProduct = endSnap?.snapshot?.[productId] || {};
        const startQty = startProduct.quantity || 0;
        const endQty = endProduct.quantity || 0;
        const used = startQty - endQty;
        const usagePercent =
          startQty > 0 ? Math.round((used / startQty) * 100) : 0;
        const unit = startProduct.unit || endProduct.unit || "szt";
        const name = startProduct.name || endProduct.name || productId;
        return [
          cleanText(name),
          cleanText(formatUnit(startQty, unit)),
          cleanText(formatUnit(endQty, unit)),
          cleanText(formatUnit(used, unit)),
          cleanText(`${usagePercent}%`),
        ];
      });

      doc.autoTable({
        head: [inventorySummaryHeaders],
        body: inventorySummaryRows,
        startY: doc.lastAutoTable.finalY + 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64] },
        theme: "grid",
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35, halign: "right" },
          2: { cellWidth: 35, halign: "right" },
          3: { cellWidth: 35, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
        },
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        cleanText(`Wygenerowano: ${new Date().toLocaleString()}`),
        15,
        doc.internal.pageSize.height - 10
      );

      // Save the PDF
      doc.save(`raport_${selectedDate}.pdf`);
      toast.success("Raport PDF został wygenerowany!");
    } catch (err) {
      console.error("Błąd generowania PDF:", err);
      toast.error("Wystąpił błąd podczas generowania raportu PDF");
    }
    setGeneratingPDF(false);
  };

  if (daySessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Ładowanie...</div>
      </div>
    );
  }

  if (!isDayStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white text-3xl px-12 py-8 rounded-xl shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleStartDay}
          disabled={loading}
        >
          Rozpocznij dzień
        </button>
        <p className="text-gray-400 mt-8 text-lg">
          Aby korzystać z systemu, rozpocznij dzień pracy.
        </p>
        {showSnapshotModal && (
          <WarehouseSnapshotModal
            type="start"
            products={warehouseProducts}
            onSave={handleSaveSnapshot}
            onClose={() => setShowSnapshotModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* Informacja o zamknięciu dnia */}
      {isDayEnded && (
        <div className="w-full bg-blue-900 text-blue-200 text-center py-3 text-lg font-semibold rounded-b-xl shadow mb-4">
          Dzień zamknięty – wszystkie operacje zablokowane
        </div>
      )}
      <h2 className="text-3xl font-bold text-white">Pulpit</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Aktywne zamówienia */}
        <div
          className={`bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between ${
            isDayEnded ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <div>
            <h3 className="text-lg text-gray-400">Aktywne zamówienia</h3>
            {aktywnych > 0 ? (
              <>
                <p className="text-4xl font-bold mt-2 text-white">
                  {aktywnych}
                </p>
                <p className="text-gray-400">Obecnie w realizacji</p>
              </>
            ) : (
              <div className="mt-2">
                <p className="text-4xl font-bold text-gray-500">0</p>
                <p className="text-gray-400">Brak aktywnych zamówień</p>
              </div>
            )}
          </div>
          <button
            onClick={() => (window.location.href = "/orders")}
            className="mt-4 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-500"
            disabled={isDayEnded}
          >
            Pokaż aktywne
          </button>
        </div>
        {/* Zakończone zamówienia */}
        <div
          className={`bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between ${
            isDayEnded ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <div>
            <h3 className="text-lg text-gray-400">Zakończone</h3>
            <p className="text-4xl font-bold mt-2 text-white">{zakonczonych}</p>
            <p className="text-gray-400">W archiwum</p>
          </div>
          <button
            onClick={() => (window.location.href = "/history")}
            className="mt-4 bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-400"
            disabled={isDayEnded}
          >
            Pokaż historię
          </button>
        </div>
        {/* Skrót do tworzenia zamówienia */}
        <div
          className={`bg-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between ${
            isDayEnded ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <div>
            <h3 className="text-lg text-gray-400 mb-6">Nowe zamówienie</h3>
          </div>
          <button
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-500 w-full font-semibold"
            onClick={() => (window.location.href = "/new-order")}
            disabled={isDayEnded}
          >
            Stwórz zamówienie
          </button>
        </div>
        {/* Stan magazynowy */}
        <div>
          <WarehouseStockTile />
        </div>
      </div>
      {/* Floating action button w prawym dolnym rogu */}
      {!isDayEnded && (
        <button
          onClick={handleEndDay}
          disabled={aktywnych > 0}
          className={`fixed bottom-6 right-6 p-4 text-white font-bold flex items-center space-x-2 ${
            aktywnych > 0
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-500"
          } rounded-lg shadow-lg transition-colors`}
        >
          {aktywnych > 0 ? (
            <span className="flex items-center gap-2">
              <FaLock className="text-lg" />
              Nie można zamknąć dnia (aktywne zamówienia)
            </span>
          ) : (
            "Zamknij dzień"
          )}
        </button>
      )}
      {/* Pobierz raport PDF po zamknięciu dnia */}
      {isDayEnded && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-full font-bold shadow-xl transition-all"
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? "Generowanie PDF..." : "Pobierz raport PDF"}
          </button>
        </div>
      )}
      {/* Modal snapshotu magazynu */}
      {showSnapshotModal && (
        <WarehouseSnapshotModal
          type={snapshotType}
          products={warehouseProducts}
          onSave={async (data) => {
            await handleSaveSnapshot(data);
            if (snapshotType === "end") {
              setHasEndSnapshot(true);
            }
          }}
          onClose={() => setShowSnapshotModal(false)}
        />
      )}
    </div>
  );
}
