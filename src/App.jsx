import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

import Landing from "./Landing";
import Login from "./Login";
import Home from "./Home";
import Customer from "./Customer";

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <Routes>
      {/* หน้าแรก */}
      <Route path="/" element={<Landing />} />

      {/* ลูกค้า */}
      <Route path="/table/:tableNumber" element={<Customer />} />

      {/* Login */}
      <Route
        path="/login"
        element={
          !user ? (
            <Login onLogin={setUser} />
          ) : (
            <Navigate to="/home" replace />
          )
        }
      />

      {/* Owner / Employee */}
      <Route
        path="/home"
        element={
          user ? (
            <Home user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;