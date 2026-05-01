import { useState, useEffect, useRef, useCallback } from "react";


// ─── SheetJS ─────────────────────────────────────────────────────────────────
function useXLSX() {
  const [ready, setReady] = useState(!!window.XLSX);
  useEffect(() => {
    if (window.XLSX) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

// ─── Constants ────────────────────────────────────────────────────────────────
const CUST = [
  { id:"retail",    th:"ลูกค้าทั่วไป", icon:"🔧", color:"#3b82f6", key:"retailPrice"    },
  { id:"diy",       th:"ซื้อกลับ",       icon:"🛠️", color:"#22c55e", key:"diyPrice"       },
  { id:"wholesale", th:"ร้านค้า/ส่ง",  icon:"🏪", color:"#f97316", key:"wholesalePrice" },
];
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DEFAULT_PARTS = [
  {name:"ไส้กรองน้ำมันเครื่อง", retailPrice:120, diyPrice:110, wholesalePrice:80},
  {name:"หัวเทียน",              retailPrice:85,  diyPrice:78,  wholesalePrice:55},
  {name:"ผ้าเบรกหน้า",          retailPrice:350, diyPrice:320, wholesalePrice:220},
  {name:"ผ้าเบรกหลัง",          retailPrice:280, diyPrice:260, wholesalePrice:180},
  {name:"โซ่ขับเคลื่อน",        retailPrice:480, diyPrice:450, wholesalePrice:320},
  {name:"ไส้กรองอากาศ",         retailPrice:180, diyPrice:165, wholesalePrice:120},
  {name:"น้ำมันเครื่อง (1L)",    retailPrice:220, diyPrice:205, wholesalePrice:150},
  {name:"ยางหน้า",              retailPrice:950, diyPrice:900, wholesalePrice:700},
  {name:"ยางหลัง",              retailPrice:1100,diyPrice:1050,wholesalePrice:820},
  {name:"แบตเตอรี่",            retailPrice:890, diyPrice:850, wholesalePrice:650},
  {name:"สายคลัทช์",            retailPrice:150, diyPrice:140, wholesalePrice:100},
  {name:"หลอดไฟหน้า",           retailPrice:95,  diyPrice:88,  wholesalePrice:60},
  {name:"จานเบรกหน้า",          retailPrice:850, diyPrice:800, wholesalePrice:600},
  {name:"โช้คหลัง",             retailPrice:1200,diyPrice:1100,wholesalePrice:880},
];

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg:"#f0f2f5", card:"#ffffff", cardBorder:"rgba(0,0,0,0.06)",
    header:"#ffffff", headerBorder:"#e8eaed",
    tabBar:"#ffffff", tabBorder:"#e8eaed", tabActive:"#3b82f6",
    text:"#111827", textSub:"#6b7280", textMuted:"#9ca3af",
    inp:"#ffffff", inpBorder:"#d1d5db", inpText:"#111827",
    divider:"#f3f4f6", hintBg:"#f0f9ff", previewBg:"#eff6ff",
    ctypeBg:"#f9fafb", ctypeBorder:"#e5e7eb",
    dropBg:"#ffffff", dropBorder:"#d1d5db", dropHover:"#f8fafc",
    delColor:"#ef4444", delBorder:"#fecaca",
    shadow:"0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    shadowMd:"0 4px 6px rgba(0,0,0,0.07)",
    saveBg:"#111827", saveColor:"#ffffff",
    sectLabel:"#9ca3af", lineDivider:"#f3f4f6",
    rowHover:"#fafafa", editBg:"#fffbeb", editBorder:"#fcd34d",
  },
  dark: {
    bg:"#0d1117", card:"#161b22", cardBorder:"#30363d",
    header:"#161b22", headerBorder:"#30363d",
    tabBar:"#161b22", tabBorder:"#30363d", tabActive:"#58a6ff",
    text:"#e6edf3", textSub:"#8b949e", textMuted:"#484f58",
    inp:"#0d1117", inpBorder:"#30363d", inpText:"#e6edf3",
    divider:"#21262d", hintBg:"#1c2333", previewBg:"#1c2333",
    ctypeBg:"#0d1117", ctypeBorder:"#30363d",
    dropBg:"#161b22", dropBorder:"#58a6ff", dropHover:"#21262d",
    delColor:"#f85149", delBorder:"#6e1b1b",
    shadow:"0 1px 3px rgba(0,0,0,0.4)",
    shadowMd:"0 4px 12px rgba(0,0,0,0.5)",
    saveBg:"#e6edf3", saveColor:"#0d1117",
    sectLabel:"#484f58", lineDivider:"#21262d",
    rowHover:"#1c2128", editBg:"#2d2008", editBorder:"#d97706",
  },
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt     = n   => Number(n).toLocaleString("th-TH");
const p2      = n   => String(n).padStart(2,"0");
const nowISO  = ()  => { const d=new Date(); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; };
const todayTH = ()  => { const d=new Date(); return `${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()+543}`; };
const mk      = iso => iso?.slice(0,7)??"";
const mlabel  = k   => { if(!k)return""; const[y,m]=k.split("-"); return `${MONTHS_TH[+m-1]} ${+y+543}`; };
const catPrice= (p,t) => { const k=(CUST.find(c=>c.id===t)||CUST[0]).key; return p[k]??p.retailPrice; };

// ─── useWidth hook ────────────────────────────────────────────────────────────
function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const xlsxReady = useXLSX();
  const width     = useWidth();
  const wide      = width >= 768; // iPad / PC = wide layout

  // ─── Theme ───────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("moto_theme") === "dark"; } catch { return false; }
  });
  const T = THEMES[isDark ? "dark" : "light"];
  useEffect(() => { document.body.style.background = T.bg; }, [isDark]);
  const toggleTheme = () => setIsDark(d => {
    const next = !d;
    try { localStorage.setItem("moto_theme", next ? "dark" : "light"); } catch {}
    return next;
  });

  // ─── App state ───────────────────────────────────────────────────────────
  const [tab,         setTab]         = useState("order");
  const [toast,       setToast]       = useState(null);
  const [parts,       setParts]       = useState([]);
  const [partsReady,  setPartsReady]  = useState(false);
  const [orders,      setOrders]      = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Order form
  const [custType,  setCustType]  = useState("retail");
  const [custName,  setCustName]  = useState("");
  const [bike,      setBike]      = useState("");
  const [search,    setSearch]    = useState("");
  const [sugg,      setSugg]      = useState([]);
  const [showDrop,  setShowDrop]  = useState(false);
  const [selPart,   setSelPart]   = useState(null);
  const [qty,       setQty]       = useState(1);
  const [overPrice, setOverPrice] = useState("");
  const [note,      setNote]      = useState("");
  const [lines,     setLines]     = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [dateStr,   setDateStr]   = useState(todayTH());

  // History filter
  const [fMonth, setFMonth] = useState(mk(nowISO()));
  const [fType,  setFType]  = useState("all");

  // Parts form
  const [pName,    setPName]    = useState("");
  const [pR,       setPR]       = useState("");
  const [pD,       setPD]       = useState("");
  const [pW,       setPW]       = useState("");
  const [pSaving,  setPSaving]  = useState(false);

  // Inline editing: parts
  const [editPartId,   setEditPartId]   = useState(null); // id of part being edited
  const [editPartData, setEditPartData] = useState({});   // {name, retailPrice, diyPrice, wholesalePrice}
  const [editPartSaving, setEditPartSaving] = useState(false);

  // Inline editing: order (history)
  const [editOrderId,   setEditOrderId]   = useState(null);
  const [editOrderData, setEditOrderData] = useState({});  // {custName, bikeBrand, custType}
  const [editOrderSaving, setEditOrderSaving] = useState(false);

  const searchRef = useRef(null);

  // ─── Toast ────────────────────────────────────────────────────────────────
  const toast$ = (msg, ok=true) => {
    setToast({msg, ok});
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const t = setInterval(() => setDateStr(todayTH()), 60000);
    return () => clearInterval(t);
  }, []);

  // ─── Load parts ───────────────────────────────────────────────────────────
  // FIX: wrapped in try/catch, separated seeding from loading, no recursive call
  const loadParts = useCallback(async () => {
    try {
      const { data, error } = await sb.from("parts").select("*").order("name");
      if (error) throw error;

      if (data.length === 0) {
        // First-time seed — insert defaults then load again (once)
        const { error: seedErr } = await sb.from("parts").insert(
          DEFAULT_PARTS.map(p => ({
            name: p.name,
            retail_price: p.retailPrice,
            diy_price: p.diyPrice,
            wholesale_price: p.wholesalePrice,
          }))
        );
        if (seedErr) throw seedErr;
        // Re-fetch after seed
        const { data: data2, error: e2 } = await sb.from("parts").select("*").order("name");
        if (e2) throw e2;
        setParts(data2.map(r => mapPart(r)));
      } else {
        setParts(data.map(r => mapPart(r)));
      }
      setPartsReady(true);
    } catch (err) {
      console.error("loadParts:", err);
      toast$(`โหลดอะไหล่ไม่ได้: ${err.message}`, false);
    }
  }, []);

  const mapPart = r => ({
    id: r.id, name: r.name,
    retailPrice: r.retail_price,
    diyPrice: r.diy_price,
    wholesalePrice: r.wholesale_price,
  });

  // ─── Load orders ──────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await sb
        .from("orders")
        .select("*, order_lines(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data.map(o => ({
        id: o.id,
        date: o.created_at?.slice(0, 10) ?? nowISO(),
        custType: o.cust_type,
        custName: o.cust_name,
        bikeBrand: o.bike_brand,
        total: o.total,
        lines: (o.order_lines || []).map(l => ({
          partName: l.part_name, qty: l.qty,
          unitPrice: l.unit_price, total: l.total, note: l.note ?? "",
        })),
      })));
    } catch (err) {
      console.error("loadOrders:", err);
      toast$(`โหลดออเดอร์ไม่ได้: ${err.message}`, false);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => { loadParts(); loadOrders(); }, []);

  // ─── Order form logic ─────────────────────────────────────────────────────
  const doSearch = val => {
    setSearch(val); setSelPart(null);
    if (!val.trim()) { setSugg([]); setShowDrop(false); return; }
    const hits = parts.filter(p => p.name.includes(val));
    setSugg(hits); setShowDrop(hits.length > 0);
  };
  const pickPart = p => { setSelPart(p); setSearch(p.name); setOverPrice(""); setSugg([]); setShowDrop(false); };

  const unitPrice = useCallback(() => {
    if (overPrice !== "" && !isNaN(+overPrice)) return +overPrice;
    if (!selPart) return 0;
    return catPrice(selPart, custType);
  }, [selPart, custType, overPrice]);

  const lineTotal = unitPrice() * qty;
  const txTotal   = lines.reduce((s, l) => s + l.total, 0);

  const addLine = () => {
    if (!selPart) return;
    const up = unitPrice();
    setLines(l => [...l, { partName: selPart.name, qty, unitPrice: up, total: up * qty, note }]);
    setSearch(""); setSelPart(null); setQty(1); setOverPrice(""); setNote("");
    searchRef.current?.focus();
  };

  // ─── Save transaction ─────────────────────────────────────────────────────
  const saveTransaction = async () => {
    if (!lines.length) return;
    setSaving(true);
    try {
      const { data: order, error } = await sb
        .from("orders")
        .insert([{ cust_type: custType, cust_name: custName || "—", bike_brand: bike || "—", total: txTotal }])
        .select().single();
      if (error) throw error;

      const { error: le } = await sb.from("order_lines").insert(
        lines.map(l => ({ order_id: order.id, part_name: l.partName, qty: l.qty, unit_price: l.unitPrice, total: l.total, note: l.note }))
      );
      if (le) throw le;

      toast$("บันทึกสำเร็จ ✅");
      setLines([]); setCustName(""); setBike("");
      loadOrders();
    } catch (err) {
      console.error("saveTransaction:", err);
      toast$(`บันทึกไม่สำเร็จ: ${err.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete order ─────────────────────────────────────────────────────────
  const deleteOrder = async id => {
    if (!window.confirm("ลบออเดอร์นี้?")) return;
    try {
      const { error } = await sb.from("orders").delete().eq("id", id);
      if (error) throw error;
      toast$("ลบแล้ว 🗑️");
      setOrders(o => o.filter(x => x.id !== id));
    } catch (err) {
      toast$(`ลบไม่สำเร็จ: ${err.message}`, false);
    }
  };

  // ─── Edit order (history) ─────────────────────────────────────────────────
  const startEditOrder = tx => {
    setEditOrderId(tx.id);
    setEditOrderData({ custName: tx.custName, bikeBrand: tx.bikeBrand, custType: tx.custType });
  };
  const saveEditOrder = async () => {
    setEditOrderSaving(true);
    try {
      const { error } = await sb.from("orders").update({
        cust_name: editOrderData.custName,
        bike_brand: editOrderData.bikeBrand,
        cust_type: editOrderData.custType,
      }).eq("id", editOrderId);
      if (error) throw error;
      setOrders(o => o.map(x => x.id === editOrderId
        ? { ...x, custName: editOrderData.custName, bikeBrand: editOrderData.bikeBrand, custType: editOrderData.custType }
        : x));
      toast$("แก้ไขแล้ว ✅");
      setEditOrderId(null);
    } catch (err) {
      toast$(`แก้ไขไม่สำเร็จ: ${err.message}`, false);
    } finally {
      setEditOrderSaving(false);
    }
  };

  // ─── Add part ─────────────────────────────────────────────────────────────
  // FIX: proper error handling, no infinite loop
  const addPart = async () => {
    if (!pName.trim()) { toast$("ใส่ชื่ออะไหล่ก่อน", false); return; }
    setPSaving(true);
    try {
      const { data, error } = await sb
        .from("parts")
        .insert([{
          name: pName.trim(),
          retail_price: +pR || 0,
          diy_price: +pD || 0,
          wholesale_price: +pW || 0,
        }])
        .select()
        .single();
      if (error) throw error;
      setParts(p => [...p, mapPart(data)].sort((a,b)=>a.name.localeCompare(b.name,"th")));
      setPName(""); setPR(""); setPD(""); setPW("");
      toast$("เพิ่มอะไหล่แล้ว ✅");
    } catch (err) {
      console.error("addPart:", err);
      toast$(`เพิ่มไม่ได้: ${err.message}`, false);
    } finally {
      setPSaving(false);
    }
  };

  // ─── Delete part ──────────────────────────────────────────────────────────
  const deletePart = async id => {
    if (!window.confirm("ลบอะไหล่นี้?")) return;
    try {
      const { error } = await sb.from("parts").delete().eq("id", id);
      if (error) throw error;
      setParts(p => p.filter(x => x.id !== id));
      toast$("ลบแล้ว 🗑️");
    } catch (err) {
      toast$(`ลบไม่ได้: ${err.message}`, false);
    }
  };

  // ─── Edit part inline ─────────────────────────────────────────────────────
  const startEditPart = p => {
    setEditPartId(p.id);
    setEditPartData({ name: p.name, retailPrice: p.retailPrice, diyPrice: p.diyPrice, wholesalePrice: p.wholesalePrice });
  };
  const saveEditPart = async () => {
    setEditPartSaving(true);
    try {
      const { error } = await sb.from("parts").update({
        name: editPartData.name,
        retail_price: +editPartData.retailPrice || 0,
        diy_price: +editPartData.diyPrice || 0,
        wholesale_price: +editPartData.wholesalePrice || 0,
      }).eq("id", editPartId);
      if (error) throw error;
      setParts(p => p.map(x => x.id === editPartId
        ? { ...x, name: editPartData.name, retailPrice: +editPartData.retailPrice||0, diyPrice: +editPartData.diyPrice||0, wholesalePrice: +editPartData.wholesalePrice||0 }
        : x));
      toast$("บันทึกแล้ว ✅");
      setEditPartId(null);
    } catch (err) {
      toast$(`บันทึกไม่สำเร็จ: ${err.message}`, false);
    } finally {
      setEditPartSaving(false);
    }
  };

  // ─── Export ───────────────────────────────────────────────────────────────
  const exportMonth = () => {
    if (!window.XLSX) return;
    const XLSX = window.XLSX, wb = XLSX.utils.book_new();
    const mo = orders.filter(o => mk(o.date) === fMonth);
    const sn = { retail:"ลูกค้าทั่วไป", diy:"ซื้อกลับ-DIY", wholesale:"ร้านค้า-ส่ง" };
    ["retail","diy","wholesale"].forEach(t => {
      const rows = mo.filter(o => o.custType === t); if (!rows.length) return;
      const data = [["วันที่","ชื่อ","รถ","อะไหล่","จำนวน","ราคา/ชิ้น","รวม","หมายเหตุ","ยอดรวม"]];
      rows.forEach(tx => tx.lines.forEach((ln, i) =>
        data.push([tx.date, tx.custName, tx.bikeBrand, ln.partName, ln.qty, ln.unitPrice, ln.total, ln.note, i===0?tx.total:""])
      ));
      data.push([], ["","","","","","","ยอดรวมเดือน","", rows.reduce((s,r)=>s+r.total,0)]);
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [10,14,12,20,5,10,10,16,12].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, sn[t]);
    });
    const sd = [["ประเภท","ออเดอร์","ยอดรวม"]];
    ["retail","diy","wholesale"].forEach(t => {
      const r = mo.filter(o => o.custType === t);
      sd.push([sn[t], r.length, r.reduce((s,x)=>s+x.total,0)]);
    });
    sd.push([], ["รวมทั้งหมด","", mo.reduce((s,r)=>s+r.total,0)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sd), "สรุป");
    XLSX.writeFile(wb, `MotoShop_${fMonth}.xlsx`);
  };

  // close dropdown on outside click
  useEffect(() => {
    const h = e => { if (!e.target.closest(".sw")) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const allMonths = [...new Set(orders.map(o => mk(o.date)))].sort().reverse();
  const hRows = orders.filter(o => mk(o.date) === fMonth && (fType === "all" || o.custType === fType));
  const hTotal = hRows.reduce((s, o) => s + o.total, 0);

  // ─── Shared style builders ────────────────────────────────────────────────
  const inp = {
    width:"100%", padding:"10px 12px",
    border:`1.5px solid ${T.inpBorder}`, borderRadius:8,
    fontSize:14, color:T.inpText, background:T.inp,
    fontFamily:"inherit", outline:"none", transition:"border-color 0.15s",
  };
  const inpFocus = { borderColor: T.tabActive };
  const card = {
    background:T.card, borderRadius:12, padding:"16px",
    marginBottom:12, boxShadow:T.shadow, border:`1px solid ${T.cardBorder}`,
  };

  // ─── Layout helpers ───────────────────────────────────────────────────────
  const PAD = wide ? "0 24px" : "0 14px";

  // ════════════════ RENDER ════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: wide ? 1100 : 480, margin:"0 auto", minHeight:"100vh", background:T.bg, paddingBottom:wide?40:90, fontFamily:"'Sarabun',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,button,textarea{font-family:'Sarabun',sans-serif;}
        input:focus,select:focus{outline:none;border-color:${T.tabActive}!important;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.4;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:${isDark?"#30363d":"#d1d5db"};border-radius:4px;}
        .drop-item:hover{background:${T.dropHover}!important;}
        .row-hover:hover{background:${T.rowHover}!important;}
        .tap:active{transform:scale(0.97);opacity:0.8;}
        a{color:inherit;}
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:"fixed", top:18, left:"50%", transform:"translateX(-50%)",
          background: toast.ok ? "#166534" : "#991b1b",
          color:"#fff", padding:"10px 22px", borderRadius:12,
          fontSize:15, fontWeight:600, zIndex:9999,
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)", whiteSpace:"nowrap",
          animation:"fadeIn 0.2s ease",
        }}>{toast.msg}</div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        background:T.header, borderBottom:`1px solid ${T.headerBorder}`,
        padding: wide ? "14px 24px" : "12px 16px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        boxShadow:T.shadow, position:"sticky", top:0, zIndex:50,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:wide?32:26}}>🏍️</span>
          <div>
            <div style={{fontSize:wide?18:15, fontWeight:800, color:T.text}}>ร้านอะไหล่มอเตอร์ไซค์</div>
            <div style={{fontSize:11, color:T.textMuted, marginTop:1}}>ระบบบันทึกการขาย</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:12,fontWeight:600,color:T.textSub,background:isDark?"#21262d":"#f3f4f6",padding:"5px 12px",borderRadius:20}}>
            {dateStr}
          </div>
          {/* Theme toggle */}
          <button className="tap" onClick={toggleTheme} title={isDark?"เปลี่ยนธีมสว่าง":"เปลี่ยนธีมมืด"}
            style={{width:52,height:28,borderRadius:14,border:"none",cursor:"pointer",
              background:isDark?"#3b82f6":"#d1d5db",position:"relative",
              transition:"background 0.25s",flexShrink:0,padding:0}}>
            <div style={{
              width:22,height:22,borderRadius:"50%",background:"#fff",
              position:"absolute",top:3,left:isDark?27:3,
              transition:"left 0.25s",display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:12,
            }}>{isDark?"🌙":"☀️"}</div>
          </button>
        </div>
      </div>

      {/* ── TAB BAR (mobile: fixed bottom, wide: top below header) ── */}
      {wide ? (
        <div style={{
          background:T.tabBar, borderBottom:`1px solid ${T.tabBorder}`,
          display:"flex", padding:"0 24px", boxShadow:T.shadowMd,
        }}>
          {[["order","📝","บันทึกออเดอร์"],["history","📊","ประวัติการขาย"],["parts","⚙️","จัดการอะไหล่"]].map(([id,ic,lb]) => (
            <button key={id} className="tap"
              style={{
                padding:"13px 24px", border:"none", background:"none", cursor:"pointer",
                color: tab===id ? T.tabActive : T.textMuted,
                borderBottom:`2.5px solid ${tab===id ? T.tabActive : "transparent"}`,
                fontSize:14, fontWeight:tab===id?700:500,
                display:"flex", alignItems:"center", gap:8, transition:"all 0.15s",
              }}
              onClick={() => setTab(id)}>
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:50,
          background:T.tabBar, borderTop:`1px solid ${T.tabBorder}`,
          display:"flex", maxWidth:480, margin:"0 auto",
          boxShadow:"0 -2px 10px rgba(0,0,0,0.1)",
        }}>
          {[["order","📝","ออเดอร์"],["history","📊","ประวัติ"],["parts","⚙️","อะไหล่"]].map(([id,ic,lb]) => (
            <button key={id} className="tap"
              style={{
                flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                padding:"10px 0 8px", border:"none", background:"none", cursor:"pointer",
                color: tab===id ? T.tabActive : T.textMuted,
                borderTop:`2.5px solid ${tab===id ? T.tabActive : "transparent"}`,
                transition:"all 0.15s",
              }}
              onClick={() => setTab(id)}>
              <span style={{fontSize:20}}>{ic}</span>
              <span style={{fontSize:11,marginTop:2,fontWeight:tab===id?700:400}}>{lb}</span>
            </button>
          ))}
        </div>
      )}

      {/* ════════════════ TAB: ORDER ════════════════ */}
      {tab==="order" && (
        <div style={{padding: wide ? "20px 0" : "10px 0"}}>
          <div style={{
            display: wide ? "grid" : "block",
            gridTemplateColumns: wide ? "1fr 420px" : undefined,
            gap: wide ? 20 : 0,
            padding: wide ? "0 24px" : 0,
            alignItems:"start",
          }}>
            {/* LEFT: form */}
            <div>
              {/* Customer type */}
              <Card T={T} pad={PAD} wide={wide}>
                <SLabel T={T}>ลูกค้าประเภทไหน?</SLabel>
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  {CUST.map(c => (
                    <button key={c.id} className="tap"
                      style={{
                        flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                        padding:wide?"14px 8px":"11px 4px", borderRadius:12, cursor:"pointer",
                        border:`1.5px solid ${custType===c.id ? c.color : T.ctypeBorder}`,
                        background: custType===c.id ? (isDark?`${c.color}20`:`${c.color}10`) : T.ctypeBg,
                        transition:"all 0.15s",
                      }}
                      onClick={() => { setCustType(c.id); setOverPrice(""); }}>
                      <span style={{fontSize:wide?26:22}}>{c.icon}</span>
                      <span style={{fontWeight:700,fontSize:wide?13:12,marginTop:5,color:custType===c.id?c.color:T.textSub,textAlign:"center"}}>{c.th}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Customer info */}
              <Card T={T} pad={PAD} wide={wide}>
                <SLabel T={T}>ข้อมูลลูกค้า (ถ้ามี)</SLabel>
                <div style={{display:"flex",gap:10,marginTop:8}}>
                  <div style={{flex:1}}>
                    <MiniLabel T={T}>ชื่อหรือเบอร์โทร</MiniLabel>
                    <input style={inp} placeholder="เช่น สมชาย / 081-xxx" value={custName} onChange={e=>setCustName(e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <MiniLabel T={T}>ยี่ห้อ/รุ่นรถ</MiniLabel>
                    <input style={inp} placeholder="Honda Wave, Yamaha…" value={bike} onChange={e=>setBike(e.target.value)}/>
                  </div>
                </div>
              </Card>

              {/* Part search */}
              <Card T={T} pad={PAD} wide={wide}>
                <SLabel T={T}>เลือกอะไหล่</SLabel>
                <div className="sw" style={{position:"relative",marginTop:8,marginBottom:10}}>
                  <MiniLabel T={T}>ชื่ออะไหล่</MiniLabel>
                  <input ref={searchRef} style={inp} placeholder="พิมพ์ชื่ออะไหล่…"
                    value={search} onChange={e=>doSearch(e.target.value)}
                    onFocus={() => sugg.length > 0 && setShowDrop(true)}
                    onKeyDown={e => { if(e.key==="Enter"&&selPart) addLine(); if(e.key==="Escape") setShowDrop(false); }}/>
                  {showDrop && (
                    <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,
                      background:T.dropBg,border:`1.5px solid ${T.dropBorder}`,borderRadius:10,
                      boxShadow:T.shadowMd,maxHeight:250,overflowY:"auto"}}>
                      {sugg.map(p => (
                        <div key={p.id} className="drop-item"
                          style={{padding:"11px 14px",cursor:"pointer",borderBottom:`1px solid ${T.divider}`,transition:"background 0.1s"}}
                          onMouseDown={() => pickPart(p)}>
                          <div style={{fontWeight:700,fontSize:14,color:T.text}}>{p.name}</div>
                          <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                            {CUST.map(c => (
                              <span key={c.id} style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,
                                color:c.color,background:isDark?`${c.color}20`:`${c.color}12`}}>
                                {c.th}: {fmt(catPrice(p, c.id))}฿
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selPart && (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:T.hintBg,borderRadius:9,padding:"10px 14px",marginBottom:10}}>
                    <span style={{fontSize:13,color:T.textSub}}>ราคา{CUST.find(c=>c.id===custType)?.th}:</span>
                    <span style={{fontSize:22,fontWeight:800,color:CUST.find(c=>c.id===custType)?.color}}>
                      {fmt(catPrice(selPart,custType))} ฿
                    </span>
                  </div>
                )}

                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <div>
                    <MiniLabel T={T}>จำนวน</MiniLabel>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <QBtn T={T} onClick={()=>setQty(q=>Math.max(1,q-1))}>−</QBtn>
                      <input style={{...inp,width:54,textAlign:"center"}} type="number" min="1"
                        value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))}/>
                      <QBtn T={T} onClick={()=>setQty(q=>q+1)}>+</QBtn>
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:110}}>
                    <MiniLabel T={T}>ราคาพิเศษ (ถ้ามี)</MiniLabel>
                    <input style={inp} type="number" min="0"
                      placeholder={selPart?String(catPrice(selPart,custType)):"—"}
                      value={overPrice} onChange={e=>setOverPrice(e.target.value)}/>
                  </div>
                  <div style={{flex:2,minWidth:130}}>
                    <MiniLabel T={T}>หมายเหตุ</MiniLabel>
                    <input style={inp} placeholder="อะไหล่แท้ / ลูกค้านำมาเอง…"
                      value={note} onChange={e=>setNote(e.target.value)}/>
                  </div>
                </div>

                {selPart && (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:T.previewBg,borderRadius:9,padding:"12px 14px",marginTop:10}}>
                    <span style={{color:T.textSub,fontSize:14}}>{selPart.name} × {qty}</span>
                    <span style={{fontSize:22,fontWeight:800,color:T.tabActive}}>{fmt(lineTotal)} ฿</span>
                  </div>
                )}

                <button className="tap"
                  style={{width:"100%",marginTop:12,padding:"13px",borderRadius:10,border:"none",
                    background:selPart?"#3b82f6":"#9ca3af",color:"#fff",fontSize:15,fontWeight:700,
                    cursor:selPart?"pointer":"default",transition:"background 0.2s"}}
                  disabled={!selPart} onClick={addLine}>
                  ➕ เพิ่มรายการ
                </button>
              </Card>
            </div>

            {/* RIGHT: order summary */}
            <div style={{position:wide?"sticky":undefined,top:wide?100:undefined}}>
              <Card T={T} pad={PAD} wide={wide}>
                <SLabel T={T}>🧾 รายการในออเดอร์ ({lines.length} รายการ)</SLabel>
                {lines.length === 0 ? (
                  <div style={{textAlign:"center",color:T.textMuted,padding:"28px 0",fontSize:14,lineHeight:1.8}}>
                    ยังไม่มีรายการ<br/>เลือกอะไหล่แล้วกด ➕ เพิ่มรายการ
                  </div>
                ) : (
                  <>
                    {lines.map((ln, i) => (
                      <div key={i} className="row-hover"
                        style={{display:"flex",alignItems:"center",gap:10,
                          padding:"11px 6px",borderBottom:`1px solid ${T.lineDivider}`,
                          borderRadius:6,transition:"background 0.1s"}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:15,color:T.text}}>{ln.partName}</div>
                          <div style={{color:T.textSub,fontSize:13,marginTop:2}}>
                            {ln.qty} ชิ้น × {fmt(ln.unitPrice)}฿
                            {ln.note && <span style={{marginLeft:6,color:T.textMuted}}>({ln.note})</span>}
                          </div>
                        </div>
                        <span style={{fontWeight:700,fontSize:16,color:T.tabActive,whiteSpace:"nowrap"}}>{fmt(ln.total)}฿</span>
                        <button onClick={()=>setLines(l=>l.filter((_,idx)=>idx!==i))}
                          style={{background:"none",border:`1.5px solid ${T.delBorder}`,color:T.delColor,
                            borderRadius:7,padding:"4px 9px",fontSize:13,cursor:"pointer",flexShrink:0}}>✕</button>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                      background:isDark?"#1c2128":"#f8fafc",borderRadius:10,padding:"14px",marginTop:12}}>
                      <span style={{fontSize:15,color:T.textSub,fontWeight:600}}>ยอดรวม</span>
                      <span style={{fontSize:26,fontWeight:800,color:T.text}}>{fmt(txTotal)} ฿</span>
                    </div>
                    <button className="tap"
                      style={{width:"100%",marginTop:10,padding:"15px",borderRadius:10,border:"none",
                        background:T.saveBg,color:T.saveColor,fontSize:16,fontWeight:700,
                        cursor:saving?"default":"pointer",opacity:saving?0.6:1}}
                      disabled={saving} onClick={saveTransaction}>
                      {saving ? "⏳ กำลังบันทึก…" : "💾 บันทึกออเดอร์"}
                    </button>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TAB: HISTORY ════════════════ */}
      {tab==="history" && (
        <div style={{padding: wide?"20px 24px":"10px 0"}}>
          {/* Filter */}
          <div style={{...card, margin: wide?0:"0 14px 12px"}}>
            <SLabel T={T}>กรองข้อมูล</SLabel>
            <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:130}}>
                <MiniLabel T={T}>เดือน</MiniLabel>
                <select style={{...inp}} value={fMonth} onChange={e=>setFMonth(e.target.value)}>
                  {(allMonths.length?allMonths:[mk(nowISO())]).map(m=>(
                    <option key={m} value={m}>{mlabel(m)}</option>
                  ))}
                </select>
              </div>
              <div style={{flex:1,minWidth:130}}>
                <MiniLabel T={T}>ประเภทลูกค้า</MiniLabel>
                <select style={{...inp}} value={fType} onChange={e=>setFType(e.target.value)}>
                  <option value="all">ทุกประเภท</option>
                  {CUST.map(c=><option key={c.id} value={c.id}>{c.th}</option>)}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"flex-end"}}>
                <button className="tap"
                  style={{padding:"10px 18px",borderRadius:9,border:"none",
                    background:"#16a34a",color:"#fff",fontSize:14,fontWeight:700,
                    cursor:xlsxReady&&hRows.length?"pointer":"default",
                    opacity:xlsxReady&&hRows.length?1:0.4,whiteSpace:"nowrap"}}
                  disabled={!xlsxReady||!hRows.length} onClick={exportMonth}>
                  📥 Export Excel
                </button>
              </div>
            </div>
          </div>

          {/* Summary chips */}
          <div style={{display:"flex",gap:10,margin:wide?"14px 0":"0 14px 12px",flexWrap:"wrap"}}>
            {CUST.map(c => {
              const r = hRows.filter(o => o.custType === c.id);
              return (
                <div key={c.id} style={{flex:1,minWidth:110,background:T.card,borderRadius:10,
                  padding:"11px 14px",borderLeft:`3px solid ${c.color}`,boxShadow:T.shadow,border:`1px solid ${T.cardBorder}`}}>
                  <div style={{fontSize:11,color:T.textSub,fontWeight:600}}>{c.icon} {c.th}</div>
                  <div style={{fontSize:17,fontWeight:800,color:T.text,marginTop:4}}>{fmt(r.reduce((s,x)=>s+x.total,0))} ฿</div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{r.length} ออเดอร์</div>
                </div>
              );
            })}
          </div>

          {loadingOrders && <div style={{textAlign:"center",color:T.textMuted,padding:32}}>⏳ กำลังโหลด…</div>}
          {!loadingOrders && hRows.length===0 && <div style={{textAlign:"center",color:T.textMuted,padding:32}}>ไม่มีข้อมูลในเดือนนี้</div>}

          <div style={{display:wide?"grid":"block",gridTemplateColumns:wide?"1fr 1fr":undefined,gap:wide?14:0}}>
            {hRows.map(tx => {
              const ct = CUST.find(c => c.id === tx.custType);
              const isEditing = editOrderId === tx.id;
              return (
                <div key={tx.id} style={{...card,margin:wide?0:"0 14px 10px",
                  border: isEditing ? `1.5px solid ${T.editBorder}` : `1px solid ${T.cardBorder}`,
                  background: isEditing ? T.editBg : T.card}}>
                  {isEditing ? (
                    // Edit mode
                    <div>
                      <SLabel T={T}>✏️ แก้ไขออเดอร์</SLabel>
                      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                        <div style={{flex:1,minWidth:120}}>
                          <MiniLabel T={T}>ชื่อลูกค้า</MiniLabel>
                          <input style={inp} value={editOrderData.custName}
                            onChange={e=>setEditOrderData(d=>({...d,custName:e.target.value}))}/>
                        </div>
                        <div style={{flex:1,minWidth:120}}>
                          <MiniLabel T={T}>รถ</MiniLabel>
                          <input style={inp} value={editOrderData.bikeBrand}
                            onChange={e=>setEditOrderData(d=>({...d,bikeBrand:e.target.value}))}/>
                        </div>
                        <div style={{flex:1,minWidth:130}}>
                          <MiniLabel T={T}>ประเภทลูกค้า</MiniLabel>
                          <select style={{...inp}} value={editOrderData.custType}
                            onChange={e=>setEditOrderData(d=>({...d,custType:e.target.value}))}>
                            {CUST.map(c=><option key={c.id} value={c.id}>{c.th}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:12}}>
                        <button className="tap"
                          style={{flex:1,padding:"10px",borderRadius:8,border:"none",
                            background:"#3b82f6",color:"#fff",fontWeight:700,cursor:"pointer",
                            opacity:editOrderSaving?0.6:1}}
                          disabled={editOrderSaving} onClick={saveEditOrder}>
                          {editOrderSaving?"กำลังบันทึก…":"✅ บันทึก"}
                        </button>
                        <button className="tap"
                          style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${T.inpBorder}`,
                            background:"none",color:T.textSub,cursor:"pointer",fontWeight:600}}
                          onClick={()=>setEditOrderId(null)}>ยกเลิก</button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                          color:ct?.color,background:isDark?`${ct?.color}22`:`${ct?.color}12`}}>
                          {ct?.icon} {ct?.th}
                        </span>
                        <span style={{fontWeight:700,color:T.text}}>{tx.custName}</span>
                        <span style={{color:T.textMuted,fontSize:13}}>🏍️ {tx.bikeBrand}</span>
                        <span style={{color:T.textMuted,fontSize:12,marginLeft:"auto"}}>{tx.date}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                        <span style={{fontSize:20,fontWeight:800,color:T.text,flex:1}}>{fmt(tx.total)} ฿</span>
                        <button className="tap"
                          style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${T.inpBorder}`,
                            background:"none",color:T.textSub,fontSize:13,cursor:"pointer",fontWeight:600}}
                          onClick={()=>startEditOrder(tx)}>✏️ แก้ไข</button>
                        <button className="tap"
                          style={{padding:"5px 12px",borderRadius:7,border:`1.5px solid ${T.delBorder}`,
                            background:"none",color:T.delColor,fontSize:13,cursor:"pointer",fontWeight:600}}
                          onClick={()=>deleteOrder(tx.id)}>🗑️ ลบ</button>
                      </div>
                      <div style={{marginTop:10,background:isDark?"#0d1117":"#f9fafb",borderRadius:8,overflow:"hidden",
                        border:`1px solid ${T.divider}`}}>
                        {tx.lines.map((ln, i) => (
                          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                            padding:"8px 12px",borderBottom:i<tx.lines.length-1?`1px solid ${T.divider}`:"none"}}>
                            <div>
                              <span style={{fontSize:13,color:T.text,fontWeight:500}}>{ln.partName}</span>
                              <span style={{fontSize:12,color:T.textMuted,marginLeft:6}}>× {ln.qty}</span>
                            </div>
                            <span style={{fontSize:13,fontWeight:600,color:T.text}}>{fmt(ln.total)}฿</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {hRows.length > 0 && (
            <div style={{...card,margin:wide?"14px 0":"0 14px 20px",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,color:T.textSub}}>{mlabel(fMonth)} · {hRows.length} ออเดอร์</span>
              <span style={{fontSize:22,fontWeight:800,color:T.text}}>{fmt(hTotal)} ฿</span>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ TAB: PARTS ════════════════ */}
      {tab==="parts" && (
        <div style={{padding:wide?"20px 24px":"10px 0"}}>
          <div style={{display:wide?"grid":"block",gridTemplateColumns:wide?"400px 1fr":undefined,gap:wide?20:0,alignItems:"start"}}>

            {/* Add new part */}
            <div style={{...card,margin:wide?0:"0 14px 12px"}}>
              <SLabel T={T}>เพิ่มอะไหล่ใหม่</SLabel>
              <div style={{marginTop:10}}>
                <MiniLabel T={T}>ชื่ออะไหล่</MiniLabel>
                <input style={inp} placeholder="เช่น ลูกสูบ, ชุดคลัทช์…"
                  value={pName} onChange={e=>setPName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addPart()}/>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                {[{lbl:"ราคาทั่วไป",c:"#3b82f6",v:pR,s:setPR},{lbl:"ราคา DIY",c:"#22c55e",v:pD,s:setPD},{lbl:"ราคาส่ง",c:"#f97316",v:pW,s:setPW}].map(f=>(
                  <div key={f.lbl} style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:f.c,marginBottom:4}}>{f.lbl} ฿</div>
                    <input style={{...inp,borderTop:`2.5px solid ${f.c}`}} type="number" min="0"
                      placeholder="0" value={f.v} onChange={e=>f.s(e.target.value)}/>
                  </div>
                ))}
              </div>
              <button className="tap"
                style={{width:"100%",marginTop:14,padding:"13px",borderRadius:10,border:"none",
                  background:"#3b82f6",color:"#fff",fontSize:15,fontWeight:700,
                  cursor:pSaving?"default":"pointer",opacity:pSaving?0.6:1}}
                disabled={pSaving} onClick={addPart}>
                {pSaving ? "⏳ กำลังบันทึก…" : "☁️ บันทึกอะไหล่ขึ้น Cloud"}
              </button>
            </div>

            {/* Parts list */}
            <div style={{...card,margin:wide?0:"0 14px 12px"}}>
              <SLabel T={T}>รายการอะไหล่ทั้งหมด ({parts.length} รายการ)</SLabel>

              {/* Header */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 68px 68px 68px 72px",
                gap:6,padding:"10px 6px 8px",borderBottom:`1px solid ${T.divider}`,marginTop:10}}>
                {[{l:"ชื่ออะไหล่",c:T.textMuted},{l:"ทั่วไป",c:"#3b82f6"},{l:"DIY",c:"#22c55e"},{l:"ส่ง",c:"#f97316"},{l:"",c:""}]
                  .map((h,i)=>(
                    <div key={i} style={{fontSize:11,fontWeight:700,color:h.c,textAlign:i>0?"right":"left"}}>{h.l}</div>
                  ))}
              </div>

              {!partsReady && <div style={{textAlign:"center",color:T.textMuted,padding:24}}>⏳ กำลังโหลด…</div>}

              {parts.map(p => {
                const isEditing = editPartId === p.id;
                return (
                  <div key={p.id} className="row-hover"
                    style={{borderBottom:`1px solid ${T.divider}`,transition:"background 0.1s",borderRadius:6,
                      background:isEditing?T.editBg:"transparent",
                      border:isEditing?`1.5px solid ${T.editBorder}`:"none",
                      marginBottom:isEditing?4:0}}>
                    {isEditing ? (
                      <div style={{padding:"10px 6px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",gap:8,marginBottom:8}}>
                          <div>
                            <MiniLabel T={T}>ชื่อ</MiniLabel>
                            <input style={{...inp,fontSize:13}} value={editPartData.name}
                              onChange={e=>setEditPartData(d=>({...d,name:e.target.value}))}/>
                          </div>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:"#3b82f6",marginBottom:4}}>ทั่วไป ฿</div>
                            <input style={{...inp,fontSize:13}} type="number" value={editPartData.retailPrice}
                              onChange={e=>setEditPartData(d=>({...d,retailPrice:e.target.value}))}/>
                          </div>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:"#22c55e",marginBottom:4}}>DIY ฿</div>
                            <input style={{...inp,fontSize:13}} type="number" value={editPartData.diyPrice}
                              onChange={e=>setEditPartData(d=>({...d,diyPrice:e.target.value}))}/>
                          </div>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:"#f97316",marginBottom:4}}>ส่ง ฿</div>
                            <input style={{...inp,fontSize:13}} type="number" value={editPartData.wholesalePrice}
                              onChange={e=>setEditPartData(d=>({...d,wholesalePrice:e.target.value}))}/>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button className="tap"
                            style={{flex:1,padding:"8px",borderRadius:7,border:"none",
                              background:"#3b82f6",color:"#fff",fontWeight:700,cursor:"pointer",
                              fontSize:13,opacity:editPartSaving?0.6:1}}
                            disabled={editPartSaving} onClick={saveEditPart}>
                            {editPartSaving?"กำลังบันทึก…":"✅ บันทึก"}
                          </button>
                          <button className="tap"
                            style={{padding:"8px 14px",borderRadius:7,border:`1px solid ${T.inpBorder}`,
                              background:"none",color:T.textSub,fontSize:13,cursor:"pointer"}}
                            onClick={()=>setEditPartId(null)}>ยกเลิก</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 68px 68px 68px 72px",
                        gap:6,padding:"10px 6px",alignItems:"center"}}>
                        <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p.name}</div>
                        <div style={{textAlign:"right",fontSize:13,color:"#3b82f6",fontWeight:600}}>{fmt(p.retailPrice)}</div>
                        <div style={{textAlign:"right",fontSize:13,color:"#22c55e",fontWeight:600}}>{fmt(p.diyPrice)}</div>
                        <div style={{textAlign:"right",fontSize:13,color:"#f97316",fontWeight:600}}>{fmt(p.wholesalePrice)}</div>
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          <button title="แก้ไข" onClick={()=>startEditPart(p)}
                            style={{background:"none",border:`1px solid ${T.inpBorder}`,color:T.textSub,
                              borderRadius:6,padding:"3px 7px",fontSize:13,cursor:"pointer"}}>✏️</button>
                          <button title="ลบ" onClick={()=>deletePart(p.id)}
                            style={{background:"none",border:`1px solid ${T.delBorder}`,color:T.delColor,
                              borderRadius:6,padding:"3px 7px",fontSize:13,cursor:"pointer"}}>✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
const Card = ({children,T,pad,wide}) => (
  <div style={{padding:wide?"0":"10px "+pad.split(" ")[1]+" 0"}}>
    <div style={{
      background:T.card, borderRadius:12, padding:16, marginBottom:12,
      boxShadow:T.shadow, border:`1px solid ${T.cardBorder}`,
    }}>{children}</div>
  </div>
);

const SLabel = ({children,T}) => (
  <div style={{fontSize:11,fontWeight:700,color:T.sectLabel,textTransform:"uppercase",letterSpacing:"0.7px"}}>{children}</div>
);

const MiniLabel = ({children,T}) => (
  <div style={{fontSize:11,fontWeight:600,color:T.textMuted,marginBottom:5,letterSpacing:"0.2px"}}>{children}</div>
);

const QBtn = ({onClick,children,T}) => (
  <button className="tap"
    style={{width:38,height:38,borderRadius:8,border:`1.5px solid ${T.ctypeBorder}`,
      background:T.ctypeBg,fontSize:20,cursor:"pointer",display:"flex",
      alignItems:"center",justifyContent:"center",flexShrink:0,color:T.text}}
    onClick={onClick}>{children}</button>
);
