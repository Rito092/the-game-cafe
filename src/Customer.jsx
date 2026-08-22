import "./App.css";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

import { getMenu } from "./services/menuService";
import { createOrder } from "./services/orderService";
import { subscribeToSessionOrders } from "./services/orderTrackingService";
import { getOrCreateActiveSession } from "./services/sessionService";
import { useCategories } from "./hooks/useCategories";
import CategoryModal from "./components/CategoryModal";

export default function Customer() {
  const { tableNumber } = useParams();

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sweetness, setSweetness] = useState("100%");
  const [ice, setIce] = useState("ปกติ");
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trackedOrders, setTrackedOrders] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
const [paymentSuccessPopup, setPaymentSuccessPopup] = useState(false);
const [trackedOrderId, setTrackedOrderId] = useState(null);
  const { categories, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    loadMenu();
  }, []);

  useEffect(() => {
    if (!tableNumber) return;

    let cancelled = false;

    getOrCreateActiveSession(tableNumber)
      .then((id) => {
        if (!cancelled) setSessionId(id);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [tableNumber]);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSessionOrders(sessionId, (orders) => {
      setTrackedOrders(orders);
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
  if (!trackedOrderId) return;

const orderRef = doc(db, "orders", trackedOrderId);
  const unsubscribe = onSnapshot(
    orderRef,
    (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const status = data.paymentStatus || "pending";

      setPaymentStatus(status);

      if (status === "paid") {
        setPaymentSuccessPopup(true);
        setPaymentInfo(null);
      }
    },
    (error) => {
      console.error("Payment realtime error:", error);
      setPaymentError("ไม่สามารถติดตามสถานะการชำระเงินได้");
    }
  );

  return () => unsubscribe();
}, [trackedOrderId]);

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

  const addToCart = (item, sweetness, ice) => {
    setCart((prev) => {
      const exist = prev.find(
        (i) =>
          i.id === item.id &&
          i.sweetness === sweetness &&
          i.ice === ice
      );

      if (exist) {
        return prev.map((i) =>
          i.id === item.id &&
          i.sweetness === sweetness &&
          i.ice === ice
            ? {
                ...i,
                qty: i.qty + 1,
              }
            : i
        );
      }

      return [
        ...prev,
        {
          ...item,
          sweetness,
          ice,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (
    id,
    sweetness,
    ice
  ) => {
    setCart((prev) => {
      const exist = prev.find(
        (i) =>
          i.id === id &&
          i.sweetness === sweetness &&
          i.ice === ice
      );
      if (!exist) return prev;

      if (exist.qty === 1) {
        return prev.filter(
          (i) =>
            !(
              i.id === id &&
              i.sweetness === sweetness &&
              i.ice === ice
            )
        );
      }

      return prev.map((i) =>
        i.id === id &&
        i.sweetness === sweetness &&
        i.ice === ice
          ? {
              ...i,
              qty: i.qty - 1,
            }
          : i
      );
    });
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const requestPayment = async (orderId) => {
    setPaymentError(null);
    setPaymentSuccessPopup(false);
    setCreatingPayment(true);

    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "ไม่สามารถสร้างรายการชำระเงินได้"
        );
      }

      // เคสป้องกันไว้: order นี้ถูกจ่ายไปแล้ว (ไม่ควรเกิดกับ order ใหม่ แต่กันไว้)
      if (data.alreadyPaid) {
        setTrackedOrderId(orderId);
        setPaymentStatus("paid");
        setPaymentSuccessPopup(true);
        setPaymentInfo(null);
        setCreatingPayment(false);
        return;
      }

      if (!data.scannableCode) {
        throw new Error("ไม่พบ QR สำหรับชำระเงิน");
      }
setTrackedOrderId(orderId);
      setPaymentInfo({
        orderId,
        scannableCode: data.scannableCode,
        amount: data.amount,
        currency: data.currency,
        productTotal: total,
      });
      setPaymentStatus(data.paymentStatus || "pending");
    } catch (error) {
      console.error(error);
      setPaymentError(
        error.message || "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน"
      );
    } finally {
      setCreatingPayment(false);
    }
  };

  const confirmOrder = async () => {
    if (cart.length === 0) {
      alert("กรุณาเลือกสินค้า");
      return;
    }

    if (!sessionId) {
      alert("กำลังเตรียมโต๊ะ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    try {
      setOrdering(true);
      const docRef = await createOrder({
        tableNumber: Number(tableNumber),
        sessionId,
        items: cart,
        total,
      });

      const orderId = docRef.id;

      alert("สั่งอาหารเรียบร้อย");

      setCart([]);
      setOrdering(false);

      await requestPayment(orderId);
    } catch (error) {
      setOrdering(false);
      console.error(error);
      alert("เกิดข้อผิดพลาดในการสั่งอาหาร");
    }
  };

  const formatOrderTime = (timestamp) => {
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
    <>
      <div className="container">
        <div className="logo-header">
          <h1 className="title">THE GAME CAFE</h1>
          <p className="subtitle">Coffee • Food • Gaming</p>
        </div>

        <div className="report-panel">
          <h2>โต๊ะ {tableNumber}</h2>

          {paymentStatus === "pending" && (
            <p style={{ color: "#d97706", fontWeight: "bold" }}>
              ⏳ รอชำระเงิน
            </p>
          )}

          {paymentStatus === "paid" && (
            <p style={{ color: "#16a34a", fontWeight: "bold" }}>
              ✅ ชำระเงินสำเร็จ
            </p>
          )}

          {paymentStatus === "failed" && (
            <p style={{ color: "#dc2626", fontWeight: "bold" }}>
              ❌ การชำระเงินไม่สำเร็จ
            </p>
          )}
        </div>

        <h2 className="section-title">🍔 เมนูอาหารและเครื่องดื่ม</h2>

        {categoriesLoading ? (
          <p style={{ textAlign: "center" }}>กำลังโหลดหมวดหมู่...</p>
        ) : (
          <div className="menu-grid" style={{ marginBottom: "24px" }}>
            {categories.map((category) => (
              <div
                key={category.id}
                className="menu-card"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedCategory(category)}
              >
                <h3>{category.name}</h3>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: "center" }}>กำลังโหลดเมนู...</p>
        ) : (
          <div className="menu-grid">
            {menu.map((item) => (
              <div key={item.id} className="menu-card">
                <img
                  src={
                    item.image ||
                    "https://via.placeholder.com/300x200?text=No+Image"
                  }
                  alt={item.name}
                  className="menu-image"
                />

                <h3>{item.name}</h3>

                <p>{item.price} บาท</p>

                {(() => {
                  const current = cart.find((i) => i.id === item.id);

                  return current ? (
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
                        onClick={() => {
                          const current = cart.find((i) => i.id === item.id);

                          removeFromCart(
                            current.id,
                            current?.sweetness,
                            current?.ice
                          );
                        }}
                      >
                        −
                      </button>

                      <strong style={{ minWidth: "24px" }}>
                        {current.qty}
                      </strong>

                      <button
                        className="btn"
                        onClick={() =>
                          addToCart(
                            item,
                            current.sweetness,
                            current.ice
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn"
                      onClick={() => {
                        setSelectedItem(item);
                        setSweetness("100%");
                        setIce("ปกติ");
                        setNote("");
                      }}
                    >
                      เพิ่มลงตะกร้า
                    </button>
                  );
                })()}
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
                          marginTop: "6px",
                          color: "#2563eb",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        ความหวาน {item.sweetness}
                      </p>

                      <p
                        style={{
                          marginTop: "4px",
                          color: "#06b6d4",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        🧊 {item.ice}
                      </p>

                      {item.note && (
                        <p
                          style={{
                            marginTop: "6px",
                            color: "#dc2626",
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          📝 {item.note}
                        </p>
                      )}

                      <p
                        style={{
                          marginTop: "6px",
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

                {creatingPayment && (
                  <p style={{ marginTop: "10px", color: "#666" }}>
                    กำลังสร้างรายการชำระเงิน...
                  </p>
                )}

                {paymentError && (
                  <p
                    style={{
                      marginTop: "10px",
                      color: "#dc2626",
                      fontWeight: "bold",
                    }}
                  >
                    {paymentError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <h2 className="section-title">📦 ติดตามออเดอร์ของโต๊ะนี้</h2>

        <div className="cart-center">
          <div className="cart-panel">
            {trackedOrders.length === 0 ? (
              <p>ยังไม่มีออเดอร์</p>
            ) : (
              trackedOrders.map((order) => (
                <div
                  key={order.id}
                  className="order-card"
                  style={{ marginBottom: "16px" }}
                >
                  <p>
                    <strong>โต๊ะ:</strong> {order.tableNumber ?? "-"}
                  </p>

                  <div className="status-line">
                    <strong>สถานะ:</strong>

                    {order.status === "กำลังทำ" && (
                      <div className="status-pending">🟡 กำลังทำ</div>
                    )}

                    {order.status === "เสิร์ฟแล้ว" && (
                      <div className="status-served">🟢 เสิร์ฟแล้ว</div>
                    )}

                    {!order.status && <div>ไม่ทราบสถานะ</div>}
                  </div>

                  <p>
                    <strong>ราคารวม:</strong> {order.total} บาท
                  </p>
<p>
  <strong>การชำระเงิน:</strong>{" "}
  {order.paymentStatus === "paid" && (
    <span style={{ color: "#16a34a", fontWeight: "bold" }}>
      ✅ ชำระเงินสำเร็จ
    </span>
  )}

  {order.paymentStatus === "pending" && (
    <span style={{ color: "#d97706", fontWeight: "bold" }}>
      ⏳ รอชำระเงิน
    </span>
  )}

  {order.paymentStatus === "failed" && (
    <span style={{ color: "#dc2626", fontWeight: "bold" }}>
      ❌ ชำระเงินไม่สำเร็จ
    </span>
  )}

  {!order.paymentStatus && (
    <span style={{ color: "#666" }}>
      ยังไม่มีข้อมูล
    </span>
  )}
</p>
                  <p>
                    <strong>เวลา:</strong> {formatOrderTime(order.createdAt)}
                  </p>

                  <hr />

                  <div className="order-items">
                    {order.items?.map((item, index) => (
                      <div key={index} style={{ marginBottom: "12px" }}>
                        <div>
                          • {item.name}
                          {item.sweetness && <> ({item.sweetness})</>}
                          {item.ice && <> 🧊 {item.ice}</>}
                          {" "}x {item.qty || 1}
                          {" "}
                          ({item.price * (item.qty || 1)} บาท)
                        </div>

                        {item.note && (
                          <div
                            style={{
                              color: "#dc2626",
                              marginLeft: "18px",
                              fontWeight: "bold",
                            }}
                          >
                            📝 {item.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "360px",
              maxWidth: "90%",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <img
              src={
                selectedItem.image ||
                "https://via.placeholder.com/300x200?text=No+Image"
              }
              alt={selectedItem.name}
              style={{
                width: "100%",
                height: "180px",
                objectFit: "cover",
                borderRadius: "12px",
                marginBottom: "16px",
              }}
            />
            <h2>{selectedItem.name}</h2>
            <p
              style={{
                color: "#666",
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              {selectedItem.description || "เครื่องดื่มคุณภาพจาก THE GAME CAFE"}
            </p>
            <p>{selectedItem.price} บาท</p>

            <h3>เลือกระดับความหวาน</h3>

            <select
              value={sweetness}
              onChange={(e) => setSweetness(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <option>0%</option>
              <option>25%</option>
              <option>50%</option>
              <option>75%</option>
              <option>100%</option>
            </select>
            <h3 style={{ marginTop: "20px" }}>
              เลือกระดับน้ำแข็ง
            </h3>

            <select
              value={ice}
              onChange={(e) => setIce(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <option>ไม่ใส่น้ำแข็ง</option>
              <option>น้ำแข็งน้อย</option>
              <option>ปกติ</option>
              <option>เพิ่มน้ำแข็ง</option>
            </select>
            <h3 style={{ marginTop: "20px" }}>
              หมายเหตุเพิ่มเติม
            </h3>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่วิป / เพิ่มช็อต / นมโอ๊ต"
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "10px",
                borderRadius: "10px",
                resize: "none",
                marginBottom: "20px",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "20px",
              }}
            >
              <button
                className="delete-btn"
                onClick={() => setSelectedItem(null)}
              >
                ยกเลิก
              </button>

              <button
                className="btn"
                onClick={() => {
                  addToCart(
                    {
                      ...selectedItem,
                      note,
                    },
                    sweetness,
                    ice
                  );

                  setSelectedItem(null);
                }}
              >
                เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}

      <CategoryModal
        category={selectedCategory}
        items={
          selectedCategory
            ? menu.filter((item) => item.categoryId === selectedCategory.id)
            : []
        }
        onClose={() => setSelectedCategory(null)}
        onSelectItem={(item) => {
          setSelectedCategory(null);
          setSelectedItem(item);
          setSweetness("100%");
          setIce("ปกติ");
          setNote("");
        }}
      />

      {paymentInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "360px",
              maxWidth: "90%",
              borderRadius: "16px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <h2>ชำระเงินผ่าน PromptPay</h2>

            {paymentInfo.productTotal != null && (
              <>
                <p style={{ marginTop: "12px", color: "#666" }}>
                  ยอดสินค้า
                </p>
                <p style={{ fontSize: "18px", fontWeight: "bold" }}>
                  {Number(paymentInfo.productTotal).toFixed(2)} บาท
                </p>
              </>
            )}

            {paymentInfo.productTotal != null &&
              Number(paymentInfo.productTotal) < 20 && (
                <>
                  <p style={{ marginTop: "12px", color: "#666" }}>
                    ยอดชำระขั้นต่ำ
                  </p>
                  <p style={{ fontSize: "18px", fontWeight: "bold" }}>
                    20.00 บาท
                  </p>
                </>
              )}

            {paymentInfo.amount != null && (
              <>
                <p style={{ marginTop: "12px", color: "#666" }}>
                  ยอดที่ต้องชำระ
                </p>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#111",
                  }}
                >
                  {(Number(paymentInfo.amount) / 100).toFixed(2)} บาท
                </p>
              </>
            )}

            <img
              src={paymentInfo.scannableCode}
              alt="PromptPay QR Code"
              style={{
                width: "240px",
                height: "240px",
                margin: "16px auto",
                display: "block",
              }}
            />

            {paymentStatus === "pending" && (
              <p style={{ color: "#d97706", fontWeight: "bold" }}>
                ⏳ รอชำระเงิน
              </p>
            )}

            {paymentStatus === "paid" && (
              <p style={{ color: "#16a34a", fontWeight: "bold" }}>
                ✅ ชำระเงินสำเร็จ
              </p>
            )}

            {paymentStatus === "failed" && (
              <p style={{ color: "#dc2626", fontWeight: "bold" }}>
                ❌ การชำระเงินไม่สำเร็จ
              </p>
            )}

            <button
              className="delete-btn"
              style={{ marginTop: "20px" }}
              onClick={() => setPaymentInfo(null)}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
      {paymentSuccessPopup && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    }}
  >
    <div
      style={{
        background: "#fff",
        width: "360px",
        maxWidth: "90%",
        borderRadius: "16px",
        padding: "30px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "60px",
          marginBottom: "10px",
        }}
      >
        ✅
      </div>

      <h2
        style={{
          color: "#16a34a",
          marginBottom: "12px",
        }}
      >
        ชำระเงินสำเร็จ
      </h2>

      <p
        style={{
          color: "#666",
          marginBottom: "8px",
        }}
      >
        ระบบได้รับการชำระเงินของคุณแล้ว
      </p>

      <p
        style={{
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
        ออเดอร์ของคุณกำลังดำเนินการ
      </p>

      <button
        className="btn"
        onClick={() => setPaymentSuccessPopup(false)}
      >
        ตกลง
      </button>
    </div>
  </div>
)}
    </>
  );
}