import "./App.css";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import americanoImg from "./assets/menu/americano.png";
import cappuccinoImg from "./assets/menu/cappuccino.png";
import latteImg from "./assets/menu/latte.png";
import matchaImg from "./assets/menu/matcha.png";

import { getMenu } from "./services/menuService";
import { createOrder } from "./services/orderService";

export default function Customer() {
  const { tableNumber } = useParams();

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
const [ordering, setOrdering] = useState(false);
  const menuImages = {
    americano: americanoImg,
    cappuccino: cappuccinoImg,
    latte: latteImg,
    matcha: matchaImg,
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await getMenu();
      setMenu(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
const addToCart = (item) => {
  setCart((prev) => {
    const exist = prev.find((i) => i.id === item.id);

    if (exist) {
      return prev.map((i) =>
        i.id === item.id
          ? { ...i, qty: i.qty + 1 }
          : i
      );
    }

    return [
      ...prev,
      {
        ...item,
        qty: 1,
      },
    ];
  });
};
  const removeFromCart = (id) => {
  setCart((prev) => {
    const exist = prev.find((i) => i.id === id);

    if (!exist) return prev;

    if (exist.qty === 1) {
      return prev.filter((i) => i.id !== id);
    }

    return prev.map((i) =>
      i.id === id
        ? { ...i, qty: i.qty - 1 }
        : i
    );
  });
};

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const confirmOrder = async () => {
    if (cart.length === 0) {
      alert("กรุณาเลือกสินค้า");
      return;
    }

    try {
        setOrdering(true);
      await createOrder({
        tableNumber: Number(tableNumber),
        items: cart,
        total,
      });

      alert("สั่งอาหารเรียบร้อย");

      setCart([]);
      setOrdering(false);
          } catch (error) {
            setOrdering(false);
      console.error(error);
      alert("เกิดข้อผิดพลาดในการสั่งอาหาร");
    }
  };

  return (
    <div className="container">
      <div className="logo-header">
        <h1 className="title">THE GAME CAFE</h1>
        <p className="subtitle">Coffee • Food • Gaming</p>
      </div>

      <div className="report-panel">
        <h2>โต๊ะ {tableNumber}</h2>
      </div>

      <h2 className="section-title">🍔 เมนูอาหารและเครื่องดื่ม</h2>

      {loading ? (
        <p style={{ textAlign: "center" }}>กำลังโหลดเมนู...</p>
      ) : (
        <div className="menu-grid">
          {menu.map((item) => (
            <div key={item.id} className="menu-card">
              <img
                src={
                  menuImages[
                    item.name?.trim().toLowerCase()
                  ]
                }
                alt={item.name}
                className="menu-image"
              />

              <h3>{item.name}</h3>

              <p>{item.price} บาท</p>

             {cart.find((i) => i.id === item.id) ? (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
      marginTop: "12px",
    }}
  >
    <button
      className="btn"
      onClick={() => removeFromCart(item.id)}
    >
      −
    </button>

    <strong style={{ minWidth: "24px" }}>
      {cart.find((i) => i.id === item.id)?.qty}
    </strong>

    <button
      className="btn"
      onClick={() => addToCart(item)}
    >
      +
    </button>
  </div>
) : (
  <button
    className="btn"
    onClick={() => addToCart(item)}
  >
    เพิ่มลงตะกร้า
  </button>
)}
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">
        🛒 ตะกร้าสินค้า
      </h2>

      <div className="cart-center">
        <div className="cart-panel">
          {cart.length === 0 ? (
            <p>ยังไม่มีสินค้า</p>
          ) : (
            <>
              {cart.map((item) => (
  <div
    key={item.id}
    className="cart-item"
    style={{
      justifyContent: "space-between",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "12px",
    }}
  >
    <div>
      <strong>{item.name}</strong>

      <p
        style={{
          marginTop: "8px",
          color: "#666",
          fontWeight: "bold",
        }}
      >
        จำนวน {item.qty} รายการ
      </p>
    </div>

    <div
      style={{
        textAlign: "right",
      }}
    >
      <strong>
        {item.price * item.qty} บาท
      </strong>

      <div
        style={{
          fontSize: "13px",
          color: "#666",
        }}
      >
        {item.price} × {item.qty}
      </div>
    </div>
  </div>
))}
<hr />
              <h3>รวม {total} บาท</h3>

              <button
                className="btn"
                onClick={confirmOrder}
              >
                ยืนยันการสั่งซื้อ
              </button>
            </>
          )}
                  </div>
      </div>
    </div>
  );
}