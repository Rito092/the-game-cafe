import { Link } from "react-router-dom";
import logo from "./assets/menu/logo.png";
import "./App.css";

export default function Landing() {
  return (
    <div className="container">
      <div className="logo-header">
        <img
          src={logo}
          alt="THE GAME CAFE"
          className="logo"
        />

        <div>
          <h1 className="title">THE GAME CAFE</h1>
          <p className="subtitle">
            Coffee • Food • Gaming
          </p>
        </div>
      </div>

      <div
        style={{
          maxWidth: "500px",
          margin: "40px auto",
          textAlign: "center",
        }}
      >
        <h2>ยินดีต้อนรับ</h2>

        <p>
          กรุณาเลือกการใช้งาน
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginTop: "40px",
          }}
        >
          <Link to="/table/1">
            <button
              className="btn"
              style={{
                width: "100%",
                padding: "18px",
                fontSize: "20px",
              }}
            >
              ☕ ลูกค้า
            </button>
          </Link>

          <Link to="/login">
            <button
              className="btn"
              style={{
                width: "100%",
                padding: "18px",
                fontSize: "20px",
              }}
            >
              🔐 เข้าสู่ระบบพนักงาน
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}