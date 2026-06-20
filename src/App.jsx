import "./App.css";
import { useState, useEffect } from "react";
import { db } from "./firebase";
import americanoImg from "./assets/menu/americano.png";
import cappuccinoImg from "./assets/menu/cappuccino.png";
import latteImg from "./assets/menu/latte.png";
import matchaImg from "./assets/menu/matcha.png";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import logo from "./assets/menu/logo.png";
function App() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
const menuImages = {
  americano: americanoImg,
  cappuccino: cappuccinoImg,
  latte: latteImg,
  matcha: matchaImg,
};
  const addToCart = (item) => {
  setCart((prev) => {
    const existingItem = prev.find((cartItem) => cartItem.id === item.id);

    if (existingItem) {
      return prev.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, qty: cartItem.qty + 1 }
          : cartItem
      );
    }

    return [...prev, { ...item, qty: 1 }];
  });
};

  const removeFromCart = (id) => {
  setCart((prev) =>
    prev
      .map((item) =>
        item.id === id
          ? { ...item, qty: item.qty - 1 }
          : item
      )
      .filter((item) => item.qty > 0)
  );
};

  const total = cart.reduce(
  (sum, item) => sum + Number(item.price || 0) * item.qty,
  0
);

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const pendingOrders = orders.filter(
    (o) => o.status === "กำลังทำ"
  ).length;

  const completedOrders = orders.filter(
    (o) => o.status === "เสร็จแล้ว"
  ).length;

  const servedOrders = orders.filter(
    (o) => o.status === "เสิร์ฟแล้ว"
  ).length;

  const fetchMenu = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, "menu")
      );

      const menuList = [];

      querySnapshot.forEach((doc) => {
        menuList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setMenu(menuList);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrders = async () => {
  try {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    const orderList = [];

    querySnapshot.forEach((doc) => {
      orderList.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    setOrders(orderList);
  } catch (error) {
    console.error(error);
  }
};

  const saveOrder = async () => {
      if (!tableNumber) {
    alert("กรุณากรอกเลขโต๊ะ");
    return;
  }
    if (cart.length === 0) {
      alert("กรุณาเลือกสินค้า");
      return;
    }

    try {
      await addDoc(collection(db, "orders"), {
         tableNumber: tableNumber,
        items: cart,
        total: total,
        status: "กำลังทำ",
        createdAt: serverTimestamp(),
      });

      alert("บันทึกออเดอร์สำเร็จ");
      setCart([]);
      setTableNumber("");
      fetchOrders();
    } catch (error) {
      console.error(error);
    }
  };

  const updateOrderStatus = async (
    orderId,
    newStatus
  ) => {
    try {
      await updateDoc(
        doc(db, "orders", orderId),
        {
          status: newStatus,
        }
      );

      fetchOrders();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("ลบออเดอร์นี้?")) return;

    try {
      await deleteDoc(
        doc(db, "orders", orderId)
      );

      fetchOrders();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchOrders();
  }, []);
const formatDate = (timestamp) => {
  if (!timestamp) return "ไม่มีเวลา";

  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return new Date(timestamp).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
};
  return (
    <div className="container">

      <div className="logo-header">
  <img
    src={logo}
    alt="The Game Cafe"
    className="logo"
  />

  <div>
    <h1 className="title">
      THE GAME CAFE
    </h1>

    <p className="subtitle">
      Coffee • Food • Gaming
    </p>
  </div>
</div>

      <div className="dashboard">
        <Card title="💰 ยอดขายรวม" value={`${totalSales} บาท`} />
        <Card title="📋 ออเดอร์ทั้งหมด" value={orders.length} />
        <Card title="🟡 กำลังทำ" value={pendingOrders} />
        <Card title="🔵 เสร็จแล้ว" value={completedOrders} />
        <Card title="🟢 เสิร์ฟแล้ว" value={servedOrders} />
      </div>

      <h2>🍔 เมนู</h2>

<div className="menu-grid">
  {menu.map((item) => (
    <div
      key={item.id}
      className="menu-card"
    >
      <img
  src={menuImages[item.name?.trim().toLowerCase()]}
  alt={item.name}
  className="menu-image"
/>

      <h3>{item.name}</h3>

      <p>{item.price} บาท</p>

      <button
        className="btn"
        onClick={() => addToCart(item)}
      >
        เพิ่มลงตะกร้า
      </button>
    </div>
  ))}
</div>
      <h2 className="section-title">
        🛒 ตะกร้าสินค้า
      </h2>

      <div className="cart-center">
  <div className="cart-panel">
    {cart.length === 0 ? (
      <p>ยังไม่มีสินค้า</p>
    ) : (
      <>
        {cart.map((item, index) => (
          <div key={index} className="cart-item">
            <span>
              {item.name} x {item.qty} - {item.price * item.qty} บาท
            </span>

            <button
              className="delete-btn"
              onClick={() => removeFromCart(item.id)}
            >
              ลบ
            </button>
          </div>
        ))}

        <div className="table-input-box">
          <label>เลขโต๊ะ</label>
          <input
            type="number"
            placeholder="เช่น 1"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="table-input"
          />
        </div>
      </>
    )}

    <h3>รวม {total} บาท</h3>

    <button className="btn" onClick={saveOrder}>
      บันทึกออเดอร์
    </button>
  </div>
</div>

<h2 className="section-title">
  📋 Orders
</h2>

      {orders.map((order) => (
        <div
  key={order.id}
  className="order-card"
>
<p>
  <strong>โต๊ะ:</strong>{" "}
  {order.tableNumber || "-"}
</p>
          <div className="status-line">
  <strong>สถานะ:</strong>

  {order.status === "กำลังทำ" && (
    <div className="status-pending">
      🟡 กำลังทำ
    </div>
  )}

  {order.status === "เสร็จแล้ว" && (
    <div className="status-complete">
      🔵 เสร็จแล้ว
    </div>
  )}

  {order.status === "เสิร์ฟแล้ว" && (
    <div className="status-served">
      🟢 เสิร์ฟแล้ว
    </div>
  )}
</div>

          <p>
            <strong>ราคารวม:</strong>{" "}
            {order.total} บาท
          </p>
<p>
  <strong>เวลา:</strong>{" "}
  {formatDate(order.createdAt)}
</p>
          <div className="order-buttons">
            <button
  className="btn"
  onClick={() =>
    updateOrderStatus(
      order.id,
      "กำลังทำ"
    )
  }
>
  กำลังทำ
</button>

            <button
  className="btn"
  onClick={() =>
    updateOrderStatus(
      order.id,
      "เสร็จแล้ว"
    )
  }
>
  เสร็จแล้ว
</button>

            <button
  className="btn"
  onClick={() =>
    updateOrderStatus(
      order.id,
      "เสิร์ฟแล้ว"
    )
  }
>
  เสิร์ฟแล้ว
</button>
          </div>

          <button
  className="delete-btn"
  onClick={() =>
    deleteOrder(order.id)
  }
>
  🗑 ลบ
</button>

          <hr />

                    <div className="order-items">
            {order.items?.map((item, index) => (
              <div key={index}>
                • {item.name} x {item.qty || 1} (
                {item.price * (item.qty || 1)} บาท)
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    );
}

function Card({ title, value }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

export default App;