import React, { createContext, useContext, useState } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState({
    role: "employee", // "employee" lub "manager"
    name: "Jan Kowalski",
  });

  const isManager = user.role === "manager";

  return (
    <UserContext.Provider value={{ user, setUser, isManager }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser musi być używany wewnątrz UserProvider");
  }
  return context;
}
