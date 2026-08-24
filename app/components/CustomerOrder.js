"use client";

/* eslint-disable @next/next/no-img-element -- Menu images can come from arbitrary user-provided URLs. */
import { useEffect, useMemo, useState } from "react";

function itemImage(item, large = false) {
  if (item.imageUrl) {
    return <img className="food-img" src={item.imageUrl} alt={item.name} />;
  }
  return (
    <div className="food-art" style={{ background: item.tone || "#fff0dd", minHeight: large ? 144 : undefined }}>
      {item.emoji || "🍽️"}
    </div>
  );
}

export default function CustomerOrder({ table = "A1", adminPreview = false, onBack }) {
  const [store, setStore] = useState({ name: "ครัวบ้านฮิม", tagline: "อาหารไทยโฮมเมด" });
  const [menuItems, setMenuItems] = useState([]);
  const [category, setCategory] = useState("ทั้งหมด");
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDarkMode(localStorage.getItem("himpos-theme") === "dark");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      localStorage.setItem("himpos-theme", next ? "dark" : "light");
      return next;
    });
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/app-data")
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        if (!data.ok) throw new Error(data.message);
        setStore(data.store);
        setMenuItems(data.menuItems.filter((item) => item.available));
      })
      .catch((error) => setMessage(error.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => ["ทั้งหมด", ...new Set(menuItems.map((item) => item.category))], [menuItems]);
  const filteredMenu = category === "ทั้งหมด" ? menuItems : menuItems.filter((item) => item.category === category);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function addToCart(item) {
    setCart((current) => {
      const found = current.find((cartItem) => cartItem.id === item.id);
      if (found) {
        return current.map((cartItem) => (cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
      }
      return [...current, { ...item, quantity: 1 }];
    });
  }

  function updateQty(id, nextQty) {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, quantity: nextQty } : item)).filter((item) => item.quantity > 0));
  }

  async function submitOrder() {
    if (submitting) return;
    setMessage("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table,
          items: cart.map((item) => ({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(data.message || "ส่งออเดอร์ไม่สำเร็จ");
        return;
      }
      setCart([]);
      setConfirming(false);
      setMessage(`ส่งออเดอร์ #${data.order.number} เข้าครัวแล้วครับ`);
    } catch (error) {
      setMessage(error.message || "ส่งออเดอร์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`customer-page${darkMode ? " dark" : ""}`}>
      <header className="customer-header">
        {adminPreview ? <button className="back-btn" onClick={onBack}>‹</button> : <div className="header-spacer" />}
        <div className="customer-brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>{store.name}</strong>
            <small>{store.tagline}</small>
          </div>
        </div>
        <button className="customer-help theme-toggle" onClick={toggleTheme} aria-label={darkMode ? "เปิดโหมดสว่าง" : "เปิดโหมดมืด"}>{darkMode ? "☀" : "☾"}</button>
      </header>

      <section className="customer-hero">
        <span>โต๊ะ {table}</span>
        <h1>สั่งอาหารได้เลยครับ</h1>
        <p>เมนูพร้อมเสิร์ฟจากครัว ลูกค้าไม่ต้องเลือกโต๊ะเอง</p>
      </section>

      <section className="customer-content">
        {message && <div className={message.includes("ส่งออเดอร์") ? "notice success" : "notice"}>{message}</div>}
        <div className="customer-search">⌕ <span>ค้นหาเมนูที่อยากทานจากหมวดหมู่ด้านล่าง</span></div>
        <div className="category-scroll">
          {categories.map((item) => (
            <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">กำลังโหลดเมนู...</div>
        ) : (
          <div className="customer-menu-grid">
            {filteredMenu.map((item) => (
              <article className="customer-food-card" key={item.id}>
                <div className="food-media">
                  {itemImage(item, true)}
                  {item.bestseller && <span className="popular">ยอดนิยม</span>}
                </div>
                <div className="food-info">
                  <span>{item.category}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description || "วัตถุดิบสดใหม่ ปรุงเมื่อได้รับออเดอร์"}</p>
                  <div>
                    <strong>฿{item.price.toLocaleString()}</strong>
                    <button onClick={() => addToCart(item)} aria-label={`เพิ่ม ${item.name}`}>＋</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {cart.length > 0 && (
        <aside className="customer-cart-preview">
          <b>ตะกร้าของคุณ</b>
          {cart.map((item) => (
            <div key={item.id}>
              <span>{item.emoji || "🍽️"} {item.name}</span>
              <div className="qty-stepper">
                <button onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                <b>{item.quantity}</b>
                <button onClick={() => updateQty(item.id, item.quantity + 1)}>＋</button>
              </div>
            </div>
          ))}
        </aside>
      )}

      {cartCount > 0 && (
        <button className="cart-bar" onClick={() => setConfirming(true)}>
          <div><b>{cartCount}</b><span>ส่งออเดอร์เข้าครัว</span></div>
          <strong>฿{cartTotal.toLocaleString()} <span>›</span></strong>
        </button>
      )}

      {confirming && (
        <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="ยืนยันออเดอร์">
          <section className="confirm-card">
            <div className="confirm-handle" />
            <div className="confirm-head">
              <div>
                <span>โต๊ะ {table}</span>
                <h2>ตรวจรายการก่อนส่งครัว</h2>
              </div>
              <button className="confirm-close" onClick={() => setConfirming(false)} aria-label="ปิด">×</button>
            </div>
            <div className="confirm-list">
              {cart.map((item) => (
                <div className="confirm-item" key={item.id}>
                  <div><b>{item.name}</b><small>฿{item.price.toLocaleString()} × {item.quantity}</small></div>
                  <strong>฿{(item.price * item.quantity).toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <div className="confirm-total">
              <span>ยอดรวมทั้งหมด</span>
              <strong>฿{cartTotal.toLocaleString()}</strong>
            </div>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirming(false)} disabled={submitting}>ยกเลิก</button>
              <button className="confirm-submit" onClick={submitOrder} disabled={submitting}>
                {submitting ? "กำลังส่ง..." : "ยืนยันส่งออเดอร์"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
