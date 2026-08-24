"use client";

/* eslint-disable @next/next/no-img-element -- Menu images can come from arbitrary user-provided URLs. */
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import CustomerOrder from "./CustomerOrder";

const navItems = [
  ["ภาพรวม", "⌂"],
  ["ออเดอร์", "▤"],
  ["โต๊ะ & QR", "▦"],
  ["เมนูอาหาร", "◈"],
  ["การชำระเงิน", "฿"],
  ["รายงาน", "◒"],
];

const emptyData = {
  store: { name: "ครัวบ้านฮิม", tagline: "Restaurant OS", owner: "อับดุลรอฮิม" },
  tables: [],
  menuItems: [],
  orders: [],
};

function Icon({ children }) {
  return <span className="icon">{children}</span>;
}

function qrUrl(table) {
  if (typeof window === "undefined") return `/order/table/${table}`;
  return `${window.location.origin}/order/table/${encodeURIComponent(table)}`;
}

function orderSummary(order) {
  return order.items?.map((item) => `${item.name} x${item.quantity}`).join(", ") || "";
}

function timeLabel(value) {
  if (!value) return "-";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  return `${Math.floor(mins / 60)} ชม.ที่แล้ว`;
}

function mediaFor(item) {
  if (item.imageUrl) return <img className="food-img" src={item.imageUrl} alt={item.name} />;
  return <div className="food-art" style={{ background: item.tone || "#fff0dd" }}>{item.emoji || "🍽️"}</div>;
}

export default function PosApp() {
  const [active, setActive] = useState("ภาพรวม");
  const [customerMode, setCustomerMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

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

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/app-data", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);
    setData({ store: json.store, tables: json.tables, menuItems: json.menuItems, orders: json.orders });
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/app-data", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        if (!json.ok) throw new Error(json.message);
        setData({ store: json.store, tables: json.tables, menuItems: json.menuItems, orders: json.orders });
      })
      .catch((error) => alive && setNotice(error.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!["ออเดอร์", "การชำระเงิน"].includes(active) || customerMode) return;
    let alive = true;
    let refreshing = false;

    async function refreshQuietly() {
      if (refreshing) return;
      refreshing = true;
      try {
        const res = await fetch("/api/app-data", { cache: "no-store" });
        const json = await res.json();
        if (alive && json.ok) {
          setData({ store: json.store, tables: json.tables, menuItems: json.menuItems, orders: json.orders });
        }
      } finally {
        refreshing = false;
      }
    }

    refreshQuietly();
    const timer = setInterval(refreshQuietly, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active, customerMode]);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 2800);
  }

  if (customerMode) return <CustomerOrder table="A1" adminPreview onBack={() => setCustomerMode(false)} />;

  const pendingOrders = data.orders.filter((order) => ["รอรับออเดอร์", "กำลังเตรียม"].includes(order.status)).length;
  const initials = data.store.owner?.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "AH";

  return (
    <main className={`app-shell${darkMode ? " dark" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div><strong>HIM<span>POS</span></strong><small>Restaurant OS</small></div>
        </div>
        <div className="store-status"><i /> {data.store.name} <span>⌄</span></div>
        <nav>
          {navItems.map(([label, icon]) => (
            <button className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)} key={label}>
              <Icon>{icon}</Icon>{label}
              {label === "ออเดอร์" && pendingOrders > 0 && <b>{pendingOrders}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Icon>⚙</Icon>ตั้งค่าร้าน</button>
          <div className="profile"><div className="avatar">{initials}</div><div><strong>{data.store.owner}</strong><small>เจ้าของร้าน</small></div><span>•••</span></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">HIM<span>POS</span></div>
          <div className="search"><Icon>⌕</Icon><input placeholder="ค้นหาออเดอร์, เมนู หรือโต๊ะ..." /></div>
          <div className="top-actions">
            <button className="demo-link" onClick={() => setCustomerMode(true)}>ดูหน้าลูกค้า ↗</button>
            <button className="theme-toggle" onClick={toggleTheme} aria-label={darkMode ? "เปิดโหมดสว่าง" : "เปิดโหมดมืด"}>{darkMode ? "☀" : "☾"}</button>
            <button className="circle-btn" onClick={() => loadData().then(() => flash("รีเฟรชข้อมูลแล้ว"))}>↻</button>
            <button className="circle-btn notification">♢<i /></button>
            <div className="top-avatar">{initials}</div>
          </div>
        </header>

        <div className="content">
          {loading ? <div className="panel loading-panel">กำลังโหลดข้อมูลร้าน...</div> : null}
          {active === "โต๊ะ & QR" && <TablesView tables={data.tables} onReload={loadData} flash={flash} />}
          {active === "เมนูอาหาร" && <MenuView menu={data.menuItems} onReload={loadData} flash={flash} />}
          {active === "ออเดอร์" && <OrdersView orders={data.orders} onReload={loadData} flash={flash} />}
          {active === "การชำระเงิน" && <PaymentsView orders={data.orders} onReload={loadData} flash={flash} />}
          {active === "รายงาน" && <ReportsView orders={data.orders} menu={data.menuItems} tables={data.tables} />}
          {active === "ภาพรวม" && <Dashboard data={data} setActive={setActive} />}
        </div>
      </section>

      {notice && <div className={notice.includes("configured") || notice.includes("not") ? "toast error" : "toast"}>{notice}</div>}
    </main>
  );
}

function Dashboard({ data, setActive }) {
  const totalSales = data.orders.reduce((sum, order) => sum + (order.status === "ปิดบิลแล้ว" || order.status === "รอชำระเงิน" ? order.total : 0), 0);
  const busy = data.tables.filter((table) => table.status !== "ว่าง" && table.status !== "ปิดใช้งาน").length;
  const free = data.tables.filter((table) => table.status === "ว่าง").length;
  const waiting = data.orders.filter((order) => order.status === "รอรับออเดอร์").length;

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">ระบบ POS ร้านอาหาร</p><h1>สวัสดีครับ {data.store.owner}</h1><p className="muted">ทุกออเดอร์จาก QR จะไหลเข้าหน้าออเดอร์เดียว แล้วจัดการต่อได้ทันที</p></div>
        <button className="primary-btn" onClick={() => setActive("ออเดอร์")}>＋ สร้างออเดอร์</button>
      </div>
      <div className="stat-grid">
        <Stat label="ยอดขายที่รอเก็บ" value={`฿${totalSales.toLocaleString()}`} note="จากออเดอร์ที่รอชำระ/ปิดบิล" icon="↗" />
        <Stat label="ออเดอร์ทั้งหมด" value={data.orders.length} note={`${waiting} ออเดอร์ใหม่`} icon="▤" />
        <Stat label="โต๊ะที่ใช้งาน" value={`${busy} / ${data.tables.length}`} note={`${free} โต๊ะว่าง`} icon="▦" />
        <Stat label="เมนูเปิดขาย" value={data.menuItems.filter((item) => item.available).length} note="รายการพร้อมให้ลูกค้าสั่ง" icon="◈" />
      </div>
      <div className="dashboard-grid">
        <section className="panel sales-panel">
          <div className="panel-heading"><div><h2>ยอดขายวันนี้</h2><p className="muted">กราฟจำลองจากยอดขายในระบบ</p></div><button className="select-btn">วันนี้⌄</button></div>
          <div className="chart"><div className="chart-y"><span>฿6k</span><span>฿4k</span><span>฿2k</span><span>฿0</span></div><div className="chart-area"><div className="grid-line" /><div className="grid-line" /><div className="grid-line" /><svg viewBox="0 0 600 170" preserveAspectRatio="none"><path d="M0 150 C35 145 45 130 80 135 S125 105 160 118 S205 75 240 95 S280 50 320 78 S370 40 410 70 S465 65 500 42 S550 55 600 18" fill="none" stroke="#e86c45" strokeWidth="3" /></svg><div className="chart-x"><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span></div></div></div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading"><div><h2>สถานะโต๊ะ</h2><p className="muted">อัปเดตจากฐานข้อมูล</p></div><button className="text-btn" onClick={() => setActive("โต๊ะ & QR")}>ดูทั้งหมด →</button></div>
          <div className="table-summary"><div><strong>{data.tables.length}</strong><span>โต๊ะทั้งหมด</span></div><div><strong className="green-text">{free}</strong><span>ว่าง</span></div><div><strong className="orange-text">{busy}</strong><span>ใช้งาน</span></div></div>
          <div className="mini-tables">{data.tables.slice(0, 8).map((table) => <div className={`mini-table ${table.status === "ว่าง" ? "free" : table.status === "รอชำระเงิน" ? "bill" : "busy"}`} key={table.id}><strong>{table.name}</strong><small>{table.status}</small></div>)}</div>
        </section>
      </div>
      <section className="panel orders-panel"><div className="panel-heading"><div><h2>ออเดอร์ล่าสุด</h2><p className="muted">รายการที่เกิดขึ้นล่าสุด</p></div><button className="text-btn" onClick={() => setActive("ออเดอร์")}>ดูออเดอร์ทั้งหมด →</button></div><OrderTable orders={data.orders.slice(0, 5)} /></section>
    </>
  );
}

function Stat({ label, value, note, icon }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{value}</strong><div className="stat-bottom"><em>live</em> <span>{note}</span></div></div>;
}

function OrderTable({ orders }) {
  return <div className="order-table"><div className="order-row order-head"><span>ออเดอร์</span><span>โต๊ะ</span><span>รายการ</span><span>ยอดรวม</span><span>สถานะ</span><span>เวลา</span></div>{orders.map((order) => <div className="order-row" key={order.id}><strong>#{order.number}</strong><b className="table-pill">{order.table}</b><span>{orderSummary(order)}</span><strong>฿{order.total.toLocaleString()}</strong><span className={`status ${order.status === "กำลังเตรียม" ? "preparing" : order.status === "รอชำระเงิน" ? "payment" : "new"}`}>{order.status}</span><small>{timeLabel(order.createdAt)}</small></div>)}</div>;
}

function TablesView({ tables, onReload, flash }) {
  const [form, setForm] = useState({ name: "", seats: 2, status: "ว่าง" });
  const [saving, setSaving] = useState(false);
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;

  async function addTable(event) {
    event.preventDefault();
    setSaving(true);
    const res = await fetch("/api/tables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) return flash(data.message);
    setForm({ name: "", seats: 2, status: "ว่าง" });
    await onReload();
    flash(`เพิ่มโต๊ะ ${data.table.name} แล้ว`);
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">จัดการพื้นที่ร้าน</p><h1>โต๊ะ & QR Code</h1><p className="muted">QR แต่ละใบล็อกโต๊ะนั้นทันที ลูกค้าสแกนแล้วสั่งได้เลย</p></div></div>
      <form className="inline-form" onSubmit={addTable}>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ชื่อโต๊ะ เช่น A5" />
        <input type="number" min="1" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} placeholder="ที่นั่ง" />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>ว่าง</option><option>กำลังใช้งาน</option><option>รอชำระเงิน</option><option>ปิดใช้งาน</option></select>
        <button className="primary-btn" disabled={saving}>＋ เพิ่มโต๊ะ</button>
      </form>
      <div className="toolbar"><div className="filter-tabs"><button className="selected">ทั้งหมด <b>{tables.length}</b></button><button>ว่าง <b>{tables.filter((t) => t.status === "ว่าง").length}</b></button><button>ใช้งาน <b>{tables.filter((t) => t.status === "กำลังใช้งาน").length}</b></button><button>รอชำระ <b>{tables.filter((t) => t.status === "รอชำระเงิน").length}</b></button></div><button className="outline-btn" onClick={() => print()}>▣ พิมพ์ QR ทั้งหมด</button></div>
      <div className="table-grid">{tables.map((table) => <div className="table-card" key={table.id}><div className="table-card-top"><span className={`dot ${table.status === "ว่าง" ? "green" : table.status === "ปิดใช้งาน" ? "gray" : table.status === "รอชำระเงิน" ? "red" : "orange"}`} />{table.status}<button>•••</button></div><div className="table-card-main"><div className="big-table-name">{table.name}<small>{table.seats} ที่นั่ง</small></div><QRCodeSVG value={qrUrl(table.name)} size={72} level="M" bgColor="#ffffff" fgColor="#252321" aria-label={`QR Code โต๊ะ ${table.name}`} /></div><div className="qr-url">{baseUrl}/order/table/{table.name}</div><div className="table-card-actions"><a href={`/order/table/${table.name}`} target="_blank">ดูหน้า QR</a><button onClick={() => navigator.clipboard.writeText(qrUrl(table.name)).then(() => flash("คัดลอกลิงก์ QR แล้ว"))}>คัดลอกลิงก์</button></div></div>)}</div>
    </>
  );
}

function MenuView({ menu, onReload, flash }) {
  const [form, setForm] = useState({ name: "", category: "", price: "", description: "", imageUrl: "", emoji: "🍽️", available: true, bestseller: false });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const formRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const filtered = activeCategory === "ทั้งหมด" ? menu : menu.filter((item) => item.category === activeCategory);

  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => data.ok && setCategories(data.categories))
      .catch(() => setCategories([...new Set(menu.map((item) => item.category))]));
  }, [menu]);

  async function addCategory(event) {
    event.preventDefault();
    setAddingCategory(true);
    const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: categoryName }) });
    const data = await res.json();
    setAddingCategory(false);
    if (!data.ok) return flash(data.message);
    setCategories((current) => [...current, data.category].sort((first, second) => first.localeCompare(second, "th")));
    setForm((current) => ({ ...current, category: data.category }));
    setCategoryName("");
    flash(`เพิ่มหมวดหมู่ ${data.category} แล้ว`);
  }

  async function updateCategory(event) {
    event.preventDefault();
    const res = await fetch("/api/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingCategory, nextName: editCategoryName }) });
    const data = await res.json();
    if (!data.ok) return flash(data.message);
    setCategories((current) => current.map((category) => category === editingCategory ? data.category : category).sort((first, second) => first.localeCompare(second, "th")));
    if (activeCategory === editingCategory) setActiveCategory(data.category);
    if (form.category === editingCategory) setForm((current) => ({ ...current, category: data.category }));
    setEditingCategory("");
    flash(`แก้ไขหมวดหมู่เป็น ${data.category} แล้ว`);
    await onReload();
  }

  async function deleteCategory(category) {
    if (!window.confirm(`ต้องการลบหมวดหมู่ ${category} ใช่ไหม`)) return;
    const res = await fetch("/api/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: category }) });
    const data = await res.json();
    if (!data.ok) return flash(data.message);
    setCategories((current) => current.filter((item) => item !== category));
    if (activeCategory === category) setActiveCategory("ทั้งหมด");
    flash(`ลบหมวดหมู่ ${category} แล้ว`);
  }

  async function addMenu(event) {
    event.preventDefault();
    setSaving(true);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (imageFile) body.append("imageFile", imageFile);
    const endpoint = editingMenu ? `/api/menu/${editingMenu.id}` : "/api/menu";
    const res = await fetch(endpoint, { method: editingMenu ? "PATCH" : "POST", body });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) return flash(data.message);
    setForm({ name: "", category: "", price: "", description: "", imageUrl: "", emoji: "🍽️", available: true, bestseller: false });
    setImageFile(null);
    setEditingMenu(null);
    formRef.current?.reset();
    await onReload();
    flash(`${editingMenu ? "แก้ไข" : "เพิ่ม"}เมนู ${data.menuItem.name} แล้ว`);
  }

  function editMenu(item) {
    setEditingMenu(item);
    setForm({ name: item.name, category: item.category, price: item.price, description: item.description || "", imageUrl: item.imageUrl || "", emoji: item.emoji || "🍽️", available: item.available, bestseller: item.bestseller });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteMenu(item) {
    if (!window.confirm(`ต้องการลบเมนู ${item.name} ใช่ไหม`)) return;
    const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) return flash(data.message);
    await onReload();
    flash(`ลบเมนู ${item.name} แล้ว`);
  }

  function cancelMenuEdit() {
    setEditingMenu(null);
    setImageFile(null);
    setForm({ name: "", category: "", price: "", description: "", imageUrl: "", emoji: "🍽️", available: true, bestseller: false });
    formRef.current?.reset();
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">คลังรายการอาหาร</p><h1>เมนูอาหาร</h1><p className="muted">เพิ่มเมนู ราคา หมวดหมู่ และรูปได้ทั้งจากลิงก์หรือไฟล์ในเครื่อง</p></div></div>
      <form className="menu-form" ref={formRef} onSubmit={addMenu}>
        <div className="form-grid">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ชื่อเมนู" />
          <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">เลือกหมวดหมู่</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
          <input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="ราคา" />
          <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="ไอคอนสำรอง" />
          <input className="span-2" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="ลิงก์รูปภาพ https://..." />
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          <textarea className="span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="คำอธิบายเมนู" />
        </div>
        <div className="form-actions">
          <label><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> เปิดขาย</label>
          <label><input type="checkbox" checked={form.bestseller} onChange={(e) => setForm({ ...form, bestseller: e.target.checked })} /> ยอดนิยม</label>
          <button className="primary-btn" disabled={saving}>{editingMenu ? "บันทึกการแก้ไข" : "＋ เพิ่มเมนูอาหาร"}</button>
          {editingMenu && <button type="button" className="outline-btn" onClick={cancelMenuEdit}>ยกเลิก</button>}
        </div>
      </form>
      <form className="category-form" onSubmit={addCategory}>
        <input required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="เพิ่มหมวดหมู่ใหม่ เช่น ของหวาน" />
        <button className="outline-btn" disabled={addingCategory}>{addingCategory ? "กำลังเพิ่ม..." : "＋ เพิ่มหมวดหมู่"}</button>
      </form>
      <div className="category-manager">
        <strong>หมวดหมู่ที่มีอยู่</strong>
        <div className="category-manager-list">
          {categories.map((category) => editingCategory === category ? (
            <form className="category-edit" onSubmit={updateCategory} key={category}>
              <input required value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} autoFocus />
              <button className="category-action save" type="submit">บันทึก</button>
              <button className="category-action" type="button" onClick={() => setEditingCategory("")}>ยกเลิก</button>
            </form>
          ) : (
            <div className="category-manager-item" key={category}>
              <span>{category}</span>
              <button className="category-action" onClick={() => { setEditingCategory(category); setEditCategoryName(category); }}>แก้ไข</button>
              <button className="category-action danger" onClick={() => deleteCategory(category)}>ลบ</button>
            </div>
          ))}
        </div>
      </div>
      <div className="toolbar"><div className="filter-tabs">{["ทั้งหมด", ...categories].map((cat) => <button className={activeCategory === cat ? "selected" : ""} onClick={() => setActiveCategory(cat)} key={cat}>{cat} <b>{cat === "ทั้งหมด" ? menu.length : menu.filter((item) => item.category === cat).length}</b></button>)}</div><button className="outline-btn">⇅ เรียงตามชื่อ</button></div>
      <div className="menu-admin-grid">{filtered.map((item) => <div className="menu-admin-card" key={item.id}>{mediaFor(item)}<div className="menu-admin-info"><span>{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><div><strong>฿{item.price.toLocaleString()}</strong><em>{item.available ? "● เปิดขาย" : "● ปิดขาย"}</em></div></div><div className="menu-admin-actions"><button className="more" onClick={() => editMenu(item)}>แก้ไข</button><button className="more danger" onClick={() => deleteMenu(item)}>ลบ</button></div></div>)}</div>
    </>
  );
}

function OrdersView({ orders, onReload, flash }) {
  const columns = ["รอรับออเดอร์", "กำลังเตรียม", "พร้อมเสิร์ฟ", "รอชำระเงิน"];
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">จัดการออเดอร์ · อัปเดตอัตโนมัติทุก 3 วินาที</p><h1>ออเดอร์ทั้งหมด</h1><p className="muted">รับออเดอร์ ส่งต่อครัว ทำเสร็จ พร้อมเสิร์ฟ และรอชำระในหน้าเดียว</p></div></div>
      <div className="order-columns">{columns.map((status) => <div key={status}><div className="column-title"><i className={status === "รอรับออเดอร์" ? "orange-dot" : status === "กำลังเตรียม" ? "blue-dot" : "green-dot"} />{status} <b>{orders.filter((o) => o.status === status).length}</b></div>{orders.filter((o) => o.status === status).map((order) => <OrderCard order={order} onReload={onReload} flash={flash} key={order.id} />)}</div>)}</div>
    </>
  );
}

function nextStatus(status) {
  if (status === "รอรับออเดอร์") return "กำลังเตรียม";
  if (status === "กำลังเตรียม") return "พร้อมเสิร์ฟ";
  if (status === "พร้อมเสิร์ฟ") return "รอชำระเงิน";
  if (status === "รอชำระเงิน") return "ปิดบิลแล้ว";
  return "ปิดบิลแล้ว";
}

function OrderCard({ order, onReload, flash }) {
  async function advance() {
    const status = nextStatus(order.status);
    const res = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!data.ok) return flash(data.message);
    await onReload();
    flash(`อัปเดตออเดอร์ #${order.number} เป็น ${status}`);
  }

  return <div className="order-card"><div><strong>#{order.number}</strong><b className="table-pill">โต๊ะ {order.table}</b><small>{timeLabel(order.createdAt)}</small></div><hr /><p>{order.items.map((item) => `• ${item.name} x${item.quantity}`).join("\n")}</p><div className="order-card-bottom"><strong>฿{order.total.toLocaleString()}</strong><button onClick={advance}>{nextStatus(order.status)} →</button></div></div>;
}

function PaymentsView({ orders, onReload, flash }) {
  const payable = orders.filter((order) => order.status === "รอชำระเงิน");
  return <><div className="page-heading"><div><p className="eyebrow">ชำระเงิน</p><h1>ออเดอร์รอปิดบิล</h1><p className="muted">ปิดบิลแล้วระบบจะคืนสถานะโต๊ะเป็นว่าง</p></div></div><div className="order-columns one-col">{payable.map((order) => <OrderCard order={order} onReload={onReload} flash={flash} key={order.id} />)}{payable.length === 0 && <div className="empty-state">ยังไม่มีออเดอร์รอชำระเงิน</div>}</div></>;
}

function ReportsView({ orders, menu, tables }) {
  const sales = orders.reduce((sum, order) => sum + order.total, 0);
  return <><div className="page-heading"><div><p className="eyebrow">รายงานร้าน</p><h1>สรุปภาพรวม</h1><p className="muted">รายงานพื้นฐานสำหรับดูสถานะร้าน</p></div></div><div className="stat-grid"><Stat label="ยอดรวมออเดอร์" value={`฿${sales.toLocaleString()}`} note="รวมทุกสถานะ" icon="฿" /><Stat label="จำนวนออเดอร์" value={orders.length} note="ทั้งหมดในระบบ" icon="▤" /><Stat label="จำนวนเมนู" value={menu.length} note="ในคลังเมนู" icon="◈" /><Stat label="จำนวนโต๊ะ" value={tables.length} note="พร้อมทำ QR" icon="▦" /></div></>;
}
