import React from "react";

const sampleProducts = [
  { name: "Wołowina", quantity: 120, unit: "kg", lowStock: 50 },
  { name: "Bułki", quantity: 200, unit: "szt", lowStock: 100 },
  { name: "Ser", quantity: 15, unit: "kg", lowStock: 10 },
  { name: "Pomidory", quantity: 30, unit: "kg", lowStock: 20 },
  { name: "Sałata", quantity: 25, unit: "kg", lowStock: 15 },
];

export default function WarehouseStockTile() {
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6">
      <h3 className="text-lg text-gray-400 mb-4">Stan magazynowy</h3>
      <div className="space-y-4">
        {sampleProducts.map((product, index) => (
          <div key={index} className="flex justify-between items-center">
            <div>
              <p className="text-white font-medium">{product.name}</p>
              <p className="text-sm text-gray-400">
                {product.quantity} {product.unit}
              </p>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                product.quantity <= product.lowStock
                  ? "bg-red-500"
                  : "bg-green-500"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center space-x-2 text-sm text-gray-400">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          <span>Dostateczny stan</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
          <span>Niski stan</span>
        </div>
      </div>
    </div>
  );
}
