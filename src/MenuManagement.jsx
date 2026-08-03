import "./App.css";
import { useState, useEffect } from "react";
import { useCategories } from "./hooks/useCategories";
import {
    getMenu,
    createMenu,
    updateMenu,
    deleteMenu,
} from "./services/menuService";
import logo from "./assets/menu/logo.png";

function MenuManagement({ user, onLogout }) {
    const { categories } = useCategories();

    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [categoryId, setCategoryId] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editCategoryId, setEditCategoryId] = useState("");

    const loadMenu = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getMenu();
            setMenu(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMenu();
    }, []);

    const getCategoryName = (id) => {
        const category = categories.find((c) => c.id === id);
        return category ? category.name : "ไม่ระบุหมวดหมู่";
    };

    const handleCreate = async () => {
        try {
            await createMenu({
                name,
                price: Number(price),
                categoryId: categoryId || null,
            });

            setName("");
            setPrice("");
            setCategoryId("");
            loadMenu();
        } catch (err) {
            alert(err.message);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditName(item.name ?? "");
        setEditPrice(String(item.price ?? ""));
        setEditCategoryId(item.categoryId ?? "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditPrice("");
        setEditCategoryId("");
    };

    const handleUpdate = async (id) => {
        try {
            await updateMenu(id, {
                name: editName,
                price: Number(editPrice),
                categoryId: editCategoryId || null,
            });

            cancelEdit();
            loadMenu();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("ลบเมนูนี้?")) return;

        try {
            await deleteMenu(id);
            loadMenu();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="container">
            <div style={{ textAlign: "right", marginBottom: "10px" }}>
                <span>
                    เข้าสู่ระบบ: {user?.email} ({user?.role})
                </span>

                <button
                    className="delete-btn"
                    onClick={onLogout}
                    style={{ marginLeft: "10px" }}
                >
                    Logout
                </button>
            </div>

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

            <h2 className="section-title">
                🍔 จัดการเมนู
            </h2>

            <div className="table-input-box">
                <label>ชื่อเมนู</label>

                <input
                    type="text"
                    placeholder="เช่น Americano"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="table-input"
                />
            </div>

            <div className="table-input-box">
                <label>ราคา</label>

                <input
                    type="number"
                    placeholder="เช่น 45"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="table-input"
                />
            </div>

            <div className="table-input-box">
                <label>หมวดหมู่</label>

                <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="table-input"
                >
                    <option value="">ไม่ระบุหมวดหมู่</option>

                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            <button className="btn" onClick={handleCreate}>
                เพิ่มเมนู
            </button>

            {loading && <p>กำลังโหลด...</p>}

            {error && <p>เกิดข้อผิดพลาด: {error.message}</p>}

            {!loading && menu.length === 0 && (
                <p>ยังไม่มีเมนู</p>
            )}

            {menu.map((item) => (
                <div key={item.id} className="order-card">
                    {editingId === item.id ? (
                        <>
                            <div className="table-input-box">
                                <label>ชื่อเมนู</label>

                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) =>
                                        setEditName(e.target.value)
                                    }
                                    className="table-input"
                                />
                            </div>

                            <div className="table-input-box">
                                <label>ราคา</label>

                                <input
                                    type="number"
                                    value={editPrice}
                                    onChange={(e) =>
                                        setEditPrice(e.target.value)
                                    }
                                    className="table-input"
                                />
                            </div>

                            <div className="table-input-box">
                                <label>หมวดหมู่</label>

                                <select
                                    value={editCategoryId}
                                    onChange={(e) =>
                                        setEditCategoryId(e.target.value)
                                    }
                                    className="table-input"
                                >
                                    <option value="">
                                        ไม่ระบุหมวดหมู่
                                    </option>

                                    {categories.map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                className="btn"
                                onClick={() => handleUpdate(item.id)}
                            >
                                บันทึก
                            </button>

                            <button
                                className="delete-btn"
                                onClick={cancelEdit}
                            >
                                ยกเลิก
                            </button>
                        </>
                    ) : (
                        <>
                            <p>
                                <strong>ชื่อ:</strong> {item.name}
                            </p>

                            <p>
                                <strong>ราคา:</strong> {item.price} บาท
                            </p>

                            <p>
                                <strong>หมวดหมู่:</strong>{" "}
                                {getCategoryName(item.categoryId)}
                            </p>

                            <button
                                className="btn"
                                onClick={() => startEdit(item)}
                            >
                                แก้ไข
                            </button>

                            <button
                                className="delete-btn"
                                onClick={() => handleDelete(item.id)}
                            >
                                🗑 ลบ
                            </button>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

export default MenuManagement;