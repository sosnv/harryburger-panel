import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "./contexts/UserContext";
import { DaySessionProvider } from "./contexts/DaySessionContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import History from "./pages/History";
import NewOrder from "./pages/NewOrder";
import Warehouse from "./pages/Warehouse";
import DayControlDashboard from "./pages/DayControlDashboard";
import DaySettings from "./pages/DaySettings";
import EmployeeConsumption from "./pages/EmployeeConsumption";

export default function App() {
  return (
    <DaySessionProvider>
      <UserProvider>
        <BrowserRouter>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 bg-[#0d0c0c] min-h-screen p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/history" element={<History />} />
                <Route path="/new-order" element={<NewOrder />} />
                <Route path="/warehouse" element={<Warehouse />} />
                <Route path="/day-control" element={<DayControlDashboard />} />
                <Route path="/day-settings" element={<DaySettings />} />
                <Route
                  path="/employee-consumption"
                  element={<EmployeeConsumption />}
                />
              </Routes>
            </main>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1a1a1a",
                color: "#fff",
                border: "1px solid #333",
              },
            }}
          />
        </BrowserRouter>
      </UserProvider>
    </DaySessionProvider>
  );
}
