import { useState } from "react";
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("กรุณากรอก Email และ Password");
      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid = userCredential.user.uid;

      const snap = await getDoc(
        doc(db, "users", uid)
      );

      if (!snap.exists()) {
        alert("ไม่พบสิทธิ์การใช้งาน");
        return;
      }

      const user = snap.data();

      onLogin(user);
    } catch (err) {
      alert(err.code);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f4f6fb",
      }}
    >
      <div
        style={{
          width: 360,
          background: "#fff",
          padding: 30,
          borderRadius: 16,
          boxShadow: "0 5px 20px rgba(0,0,0,.1)",
        }}
      >
        <h2 style={{ textAlign: "center" }}>
          THE GAME CAFE
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={{
            width: "100%",
            padding: 10,
            marginTop: 20,
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={{
            width: "100%",
            padding: 10,
            marginTop: 10,
          }}
        />

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 20,
            padding: 12,
            cursor: "pointer",
          }}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "Login"}
        </button>
      </div>
    </div>
  );
}

export default Login;