import "./App.css";
import QRCode from "react-qr-code";
export default function QRPage() {
  const tables = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="container">
      <h1 className="title">QR Code โต๊ะทั้งหมด</h1>
<div
  style={{
    textAlign: "center",
    marginBottom: "25px",
  }}
>
  <button
    className="btn"
    onClick={() => window.print()}
  >
    🖨 พิมพ์ QR ทั้งหมด
  </button>
</div>
      <div className="menu-grid">
        {tables.map((table) => (
          <div key={table} className="menu-card">
            <h2>โต๊ะ {table}</h2>

            <div
  style={{
    background: "#fff",
    padding: "12px",
    borderRadius: "12px",
    display: "inline-block",
    marginTop: "10px",
  }}
>
  <QRCode
    value={`https://the-game-cafe-gamma.vercel.app/table/${table}`}
    size={180}
  />
</div>

            <p>สแกนเพื่อสั่งอาหาร</p>
          </div>
        ))}
      </div>
    </div>
  );
}