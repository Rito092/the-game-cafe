import "./App.css";
import { useState } from "react";
import { useCategories } from "./hooks/useCategories";
import {
    createCategory,
    updateCategory,
    deleteCategory,
} from "./services/categoryService";
import logo from "./assets/menu/logo.png";

function CategoryManagement({ user, onLogout }) {
    const { categories, loading, error, reload } = useCategories();

    const [name, setName] = useState("");
    const [order, setOrder] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editOrder, setEditOrder] = useState("");

    const handleCreate = async () => {
        try {
            await createCategory({
                name,
                order: Number(order),
            });

            setName("");
            setOrder("");
            reload();
        } catch (err) {
            alert(err.message);
        }
    };

    const startEdit = (category) => {
        setEditingId(category.id);
        setEditName(category.name ?? "");
        setEditOrder(String(category.order ?? ""));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditOrder("");
    };

    const handleUpdate = async (id) => {
        try {
            await updateCategory(id, {
                name: editName,
                order: Number(editOrder),
            });

            cancelEdit();
            reload();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("ลบหมวดหมู่นี้?")) return;

        try {
            await deleteCategory(id);
            reload();
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
                🗂️ จัดการหมวดหมู่เมนู
            </h2>

            <div className="table-input-box">
                <label>ชื่อหมวดหมู่</label>

                <input
                    type="text"
                    placeholder="เช่น เครื่องดื่ม"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="table-input"
                />
            </div>

            <div className="table-input-box">
                <label>ลำดับ</label>

                <input
                    type="number"
                    placeholder="เช่น 1"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="table-input"
                />
            </div>

            <button className="btn" onClick={handleCreate}>
                เพิ่มหมวดหมู่
            </button>

            {loading && <p>กำลังโหลด...</p>}

            {error && <p>เกิดข้อผิดพลาด: {error.message}</p>}

            {!loading && categories.length === 0 && (
                <p>ยังไม่มีหมวดหมู่</p>
            )}

            {categories.map((category) => (
                <div key={category.id} className="order-card">
                    {editingId === category.id ? (
                        <>
                            <div className="table-input-box">
                                <label>ชื่อหมวดหมู่</label>

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
                                <label>ลำดับ</label>

                                <input
                                    type="number"
                                    value={editOrder}
                                    onChange={(e) =>
                                        setEditOrder(e.target.value)
                                    }
                                    className="table-input"
                                />
                            </div>

                            <button
                                className="btn"
                                onClick={() => handleUpdate(category.id)}
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
                                <strong>ชื่อ:</strong> {category.name}
                            </p>

                            <p>
                                <strong>ลำดับ:</strong> {category.order}
                            </p>

                            <button
                                className="btn"
                                onClick={() => startEdit(category)}
                            >
                                แก้ไข
                            </button>

                            <button
                                className="delete-btn"
                                onClick={() => handleDelete(category.id)}
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

export default CategoryManagement;