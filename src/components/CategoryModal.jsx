export default function CategoryModal({ category, items, onClose, onSelectItem }) {
  if (!category) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 998,
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "600px",
          maxWidth: "92%",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: 0 }}>{category.name}</h2>

          <button className="delete-btn" onClick={onClose}>
            ปิด
          </button>
        </div>

        {items.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            ยังไม่มีเมนูในหมวดหมู่นี้
          </p>
        ) : (
          <div className="menu-grid">
            {items.map((item) => (
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

                <button
                  className="btn"
                  onClick={() => onSelectItem(item)}
                >
                  เพิ่มลงตะกร้า
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}