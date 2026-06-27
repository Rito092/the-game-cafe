import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

import Login from "./Login.jsx";
import Home from "./Home.jsx";

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <Home user={user} onLogout={handleLogout} />;
}

export default App;