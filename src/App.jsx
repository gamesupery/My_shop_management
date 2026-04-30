import { useState, useEffect, useRef, useCallback } from "react";
import { sb } from "./supabase";

// ─── SheetJS ────────────────────────────────────────────────────────────────
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

// ─── Supabase ────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

// ─── ประเภทลูกค้า ────────────────────────────────────────────────────────────
const CUST = [
  { id:"retail",    th:"ลูกค้าทั่วไป", icon:"🔧", color:"#3b82f6", key:"retailPrice"    },
  { id:"diy",       th:"ซื้อเอง",       icon:"🛠️", color:"#22c55e", key:"diyPrice"       },
  { id:"wholesale", th:"ร้านค้า/ส่ง",  icon:"🏪", color:"#f97316", key:"wholesalePrice" },
];

const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                   "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

// ─── Utilities ───────────────────────────────────────────────────────────────
const fmt     = n   => Number(n).toLocaleString("th-TH");
const p2      = n   => String(n).padStart(2,"0");
const nowISO  = ()  => { const d=new Date(); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; };
const todayTH = ()  => { const d=new Date(); return `${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()+543}`; };
const mk      = iso => iso?.slice(0,7)??"";
const mlabel  = key => { if(!key)return""; const[y,m]=key.split("-"); return `${MONTHS_TH[+m-1]} ${+y+543}`; };
const catPrice= (part,type) => { const k=(CUST.find(c=>c.id===type)||CUST[0]).key; return part[k]??part.retailPrice; };

// ─── Default parts ───────────────────────────────────────────────────────────
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

// ─── Theme definitions ───────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg:          "#f2f4f7",
    card:        "#ffffff",
    cardBorder:  "transparent",
    header:      "#ffffff",
    headerBorder:"#f0f0f0",
    tabBar:      "#ffffff",
    tabBorder:   "#f0f0f0",
    tabActive:   "#3b82f6",
    text:        "#111111",
    textSub:     "#6b7280",
    textMuted:   "#9ca3af",
    inp:         "#ffffff",
    inpBorder:   "#e5e7eb",
    inpText:     "#111111",
    divider:     "#f3f4f6",
    hintBg:      "#f0f9ff",
    previewBg:   "#eff6ff",
    ctypeBg:     "#f9fafb",
    ctypeBorder: "#e5e7eb",
    dropBg:      "#ffffff",
    dropBorder:  "#e5e7eb",
    dropHover:   "#f8fafc",
    delBorder:   "#fecaca",
    delColor:    "#ef4444",
    shadow:      "0 1px 4px rgba(0,0,0,0.07)",
    shadowMd:    "0 2px 8px rgba(0,0,0,0.08)",
    saveBg:      "#111111",
    saveColor:   "#ffffff",
    sectLabel:   "#9ca3af",
    toggleBg:    "#e5e7eb",
    toggleThumb: "#ffffff",
    sumBorder:   "#e5e7eb",
    lineDivider: "#f0f0f0",
  },
  dark: {
    bg:          "#0f1117",
    card:        "#1c1f26",
    cardBorder:  "#2a2d36",
    header:      "#1c1f26",
    headerBorder:"#2a2d36",
    tabBar:      "#1c1f26",
    tabBorder:   "#2a2d36",
    tabActive:   "#60a5fa",
    text:        "#f1f5f9",
    textSub:     "#94a3b8",
    textMuted:   "#64748b",
    inp:         "#12151c",
    inpBorder:   "#2e3340",
    inpText:     "#f1f5f9",
    divider:     "#22262f",
    hintBg:      "#1e2a3a",
    previewBg:   "#1a2540",
    ctypeBg:     "#12151c",
    ctypeBorder: "#2e3340",
    dropBg:      "#1c1f26",
    dropBorder:  "#3b82f6",
    dropHover:   "#22262f",
    delBorder:   "#7f1d1d",
    delColor:    "#f87171",
    shadow:      "0 1px 8px rgba(0,0,0,0.4)",
    shadowMd:    "0 4px 16px rgba(0,0,0,0.5)",
    saveBg:      "#f1f5f9",
    saveColor:   "#111111",
    sectLabel:   "#475569",
    toggleBg:    "#3b82f6",
    toggleThumb: "#ffffff",
    sumBorder:   "#2e3340",
    lineDivider: "#22262f",
  },
};

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const xlsxReady = useXLSX();

  // ─── Theme ───────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(()=>{
    try { return localStorage.getItem("moto_theme")==="dark"; } catch { return false; }
  });
  const T = THEMES[isDark ? "dark" : "light"];

  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d;
      try { localStorage.setItem("moto_theme", next?"dark":"light"); } catch{}
      return next;
    });
  };

  // apply bg to body
  useEffect(()=>{ document.body.style.background = T.bg; },[isDark]);

  // ─── State ────────────────────────────────────────────────────────────────
  const [tab,        setTab]        = useState("order");
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [parts,      setParts]      = useState([]);
  const [partsLoaded,setPartsLoaded]= useState(false);
  const [orders,     setOrders]     = useState([]);
  const [custType,   setCustType]   = useState("retail");
  const [custName,   setCustName]   = useState("");
  const [bike,       setBike]       = useState("");
  const [search,     setSearch]     = useState("");
  const [sugg,       setSugg]       = useState([]);
  const [showDrop,   setShowDrop]   = useState(false);
  const [selPart,    setSelPart]    = useState(null);
  const [qty,        setQty]        = useState(1);
  const [overPrice,  setOverPrice]  = useState("");
  const [note,       setNote]       = useState("");
  const [lines,      setLines]      = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [dateStr,    setDateStr]    = useState(todayTH());
  const [fMonth,     setFMonth]     = useState(mk(nowISO()));
  const [fType,      setFType]      = useState("all");
  const [pName,      setPName]      = useState("");
  const [pR,         setPR]         = useState("");
  const [pD,         setPD]         = useState("");
  const [pW,         setPW]         = useState("");
  const [pSaving,    setPSaving]    = useState(false);
  const searchRef = useRef(null);

  const showToast = (msg, ok=true) => {
    setToast({msg,ok});
    setTimeout(()=>setToast(null), 2800);
  };

  useEffect(()=>{ const t=setInterval(()=>setDateStr(todayTH()),60000); return()=>clearInterval(t); },[]);

  // ─── Supabase: load parts ─────────────────────────────────────────────────
  const loadParts = useCallback(async()=>{
    const {data,error}=await sb.from("parts").select("*").order("name");
    if(error){ showToast("โหลดอะไหล่ไม่ได้ ❌",false); return; }
    if(data.length===0){
      await sb.from("parts").insert(DEFAULT_PARTS.map(p=>({
        name:p.name, retail_price:p.retailPrice,
        diy_price:p.diyPrice, wholesale_price:p.wholesalePrice
      })));
      loadParts(); return;
    }
    setParts(data.map(r=>({id:r.id,name:r.name,retailPrice:r.retail_price,diyPrice:r.diy_price,wholesalePrice:r.wholesale_price})));
    setPartsLoaded(true);
  },[]);

  // ─── Supabase: load orders ────────────────────────────────────────────────
  const loadOrders = useCallback(async()=>{
    setLoading(true);
    const {data,error}=await sb.from("orders").select("*, order_lines(*)").order("created_at",{ascending:false});
    setLoading(false);
    if(error){ showToast("โหลดออเดอร์ไม่ได้ ❌",false); return; }
    setOrders(data.map(o=>({
      id:o.id, date:o.created_at?.slice(0,10)??nowISO(),
      custType:o.cust_type, custName:o.cust_name, bikeBrand:o.bike_brand, total:o.total,
      lines:(o.order_lines||[]).map(l=>({partName:l.part_name,qty:l.qty,unitPrice:l.unit_price,total:l.total,note:l.note??""}))
    })));
  },[]);

  useEffect(()=>{ loadParts(); loadOrders(); },[]);

  // ─── Autocomplete ─────────────────────────────────────────────────────────
  const doSearch = val=>{
    setSearch(val); setSelPart(null);
    if(!val.trim()){ setSugg([]); setShowDrop(false); return; }
    const hits=parts.filter(p=>p.name.includes(val));
    setSugg(hits); setShowDrop(hits.length>0);
  };
  const pickPart = p=>{ setSelPart(p); setSearch(p.name); setOverPrice(""); setSugg([]); setShowDrop(false); };

  const unitPrice = useCallback(()=>{
    if(overPrice!==""&&!isNaN(+overPrice)) return +overPrice;
    if(!selPart) return 0;
    return catPrice(selPart,custType);
  },[selPart,custType,overPrice]);

  const lineTotal = unitPrice()*qty;
  const txTotal   = lines.reduce((s,l)=>s+l.total,0);

  // ─── Add line ─────────────────────────────────────────────────────────────
  const addLine = ()=>{
    if(!selPart) return;
    const up=unitPrice();
    setLines(l=>[...l,{partName:selPart.name,qty,unitPrice:up,total:up*qty,note}]);
    setSearch(""); setSelPart(null); setQty(1); setOverPrice(""); setNote("");
    searchRef.current?.focus();
  };

  // ─── Save transaction ─────────────────────────────────────────────────────
  const saveTransaction = async()=>{
    if(!lines.length) return;
    setSaving(true);
    const {data:order,error}=await sb.from("orders")
      .insert([{cust_type:custType,cust_name:custName||"—",bike_brand:bike||"—",total:txTotal}])
      .select().single();
    if(error){ showToast("บันทึกไม่สำเร็จ ❌",false); setSaving(false); return; }
    const {error:le}=await sb.from("order_lines").insert(
      lines.map(l=>({order_id:order.id,part_name:l.partName,qty:l.qty,unit_price:l.unitPrice,total:l.total,note:l.note}))
    );
    if(le){ showToast("บันทึกรายการไม่สำเร็จ ❌",false); setSaving(false); return; }
    showToast("บันทึกสำเร็จ ✅");
    setLines([]); setCustName(""); setBike(""); setSaving(false);
    loadOrders();
  };

  // ─── Delete order ─────────────────────────────────────────────────────────
  const deleteOrder = async id=>{
    if(!window.confirm("ลบออเดอร์นี้?")) return;
    const {error}=await sb.from("orders").delete().eq("id",id);
    if(error){ showToast("ลบไม่สำเร็จ ❌",false); return; }
    showToast("ลบแล้ว 🗑️");
    setOrders(o=>o.filter(x=>x.id!==id));
  };

  // ─── Add / delete part ────────────────────────────────────────────────────
  const addPart = async()=>{
    if(!pName.trim()){ showToast("ใส่ชื่ออะไหล่ก่อน",false); return; }
    setPSaving(true);
    const {data,error}=await sb.from("parts")
      .insert([{name:pName.trim(),retail_price:+pR||0,diy_price:+pD||0,wholesale_price:+pW||0}])
      .select().single();
    if(error){ showToast("เพิ่มอะไหล่ไม่ได้ ❌",false); setPSaving(false); return; }
    setParts(p=>[...p,{id:data.id,name:data.name,retailPrice:data.retail_price,diyPrice:data.diy_price,wholesalePrice:data.wholesale_price}]);
    setPName(""); setPR(""); setPD(""); setPW(""); setPSaving(false);
    showToast("เพิ่มอะไหล่แล้ว ✅");
  };
  const deletePart = async id=>{
    if(!window.confirm("ลบอะไหล่นี้?")) return;
    const {error}=await sb.from("parts").delete().eq("id",id);
    if(error){ showToast("ลบไม่ได้ ❌",false); return; }
    setParts(p=>p.filter(x=>x.id!==id));
    showToast("ลบแล้ว 🗑️");
  };

  // ─── Export Excel ─────────────────────────────────────────────────────────
  const exportMonth = ()=>{
    if(!window.XLSX) return;
    const XLSX=window.XLSX; const wb=XLSX.utils.book_new();
    const mo=orders.filter(o=>mk(o.date)===fMonth);
    const sn={retail:"ลูกค้าทั่วไป",diy:"ซื้อเอง-DIY",wholesale:"ร้านค้า-ส่ง"};
    ["retail","diy","wholesale"].forEach(t=>{
      const rows=mo.filter(o=>o.custType===t); if(!rows.length) return;
      const data=[["วันที่","ชื่อ","รถ","อะไหล่","จำนวน","ราคา/ชิ้น","รวม","หมายเหตุ","ยอดรวม"]];
      rows.forEach(tx=>tx.lines.forEach((ln,i)=>data.push([tx.date,tx.custName,tx.bikeBrand,ln.partName,ln.qty,ln.unitPrice,ln.total,ln.note,i===0?tx.total:""])));
      data.push([],["","","","","","","ยอดรวมเดือน","",rows.reduce((s,r)=>s+r.total,0)]);
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws["!cols"]=[10,14,12,20,5,10,10,16,12].map(w=>({wch:w}));
      XLSX.utils.book_append_sheet(wb,ws,sn[t]);
    });
    const sd=[["ประเภท","ออเดอร์","ยอดรวม"]];
    ["retail","diy","wholesale"].forEach(t=>{ const r=mo.filter(o=>o.custType===t); sd.push([sn[t],r.length,r.reduce((s,x)=>s+x.total,0)]); });
    sd.push([],["รวมทั้งหมด","",mo.reduce((s,r)=>s+r.total,0)]);
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sd),"สรุป");
    XLSX.writeFile(wb,`MotoShop_${fMonth}.xlsx`);
  };

  useEffect(()=>{
    const h=e=>{ if(!e.target.closest(".sw")) setShowDrop(false); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const allMonths=[...new Set(orders.map(o=>mk(o.date)))].sort().reverse();
  const hRows=orders.filter(o=>mk(o.date)===fMonth&&(fType==="all"||o.custType===fType));
  const hTotal=hRows.reduce((s,o)=>s+o.total,0);

  // ─── Style builders (theme-aware) ─────────────────────────────────────────
  const inp = {
    width:"100%", padding:"11px 12px",
    border:`1.5px solid ${T.inpBorder}`,
    borderRadius:9, fontSize:14,
    color:T.inpText, background:T.inp,
    transition:"border 0.15s", fontFamily:"inherit",
  };
  const card = {
    background:T.card, borderRadius:14, padding:"14px",
    marginBottom:12, boxShadow:T.shadow,
    border:`1px solid ${T.cardBorder}`,
  };
  const sel = { ...inp };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:T.bg,paddingBottom:90,fontFamily:"'Sarabun',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,button{font-family:'Sarabun',sans-serif;}
        input:focus{outline:none;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.4;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:${isDark?"#334155":"#d1d5db"};border-radius:4px;}
        .sw .drop-item:hover{background:${T.dropHover};}
        .tap:active{opacity:0.7;transform:scale(0.97);}
      `}</style>

      {/* ── Toast ── */}
      {toast&&(
        <div style={{
          position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
          background:toast.ok?"#166534":"#991b1b",
          color:"#fff",padding:"10px 22px",borderRadius:12,
          fontSize:15,fontWeight:600,zIndex:999,
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap",
        }}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div style={{
        background:T.header,padding:"13px 16px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        boxShadow:T.shadow, borderBottom:`1px solid ${T.headerBorder}`,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:28}}>🏍️</span>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:T.text}}>ร้านอะไหล่มอเตอร์ไซค์</div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>ระบบบันทึกการขาย</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:12,fontWeight:600,color:T.textSub,background:isDark?"#22262f":"#f3f4f6",padding:"5px 11px",borderRadius:20}}>
            {dateStr}
          </div>
          {/* Theme Toggle */}
          <button className="tap" onClick={toggleTheme}
            style={{
              width:50, height:26, borderRadius:13, border:"none", cursor:"pointer",
              background:isDark?"#3b82f6":"#d1d5db",
              position:"relative", transition:"background 0.25s", flexShrink:0,
              padding:0,
            }}>
            <div style={{
              width:20, height:20, borderRadius:"50%", background:"#fff",
              position:"absolute", top:3,
              left:isDark?27:3,
              transition:"left 0.25s",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,
            }}>
              {isDark?"🌙":"☀️"}
            </div>
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display:"flex", background:T.tabBar,
        borderBottom:`1px solid ${T.tabBorder}`,
        position:"sticky", top:0, zIndex:40,
        boxShadow:T.shadowMd,
      }}>
        {[["order","📝","ออเดอร์"],["history","📊","ประวัติ"],["parts","⚙️","อะไหล่"]].map(([id,ic,lb])=>(
          <button key={id} className="tap"
            style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              padding:"10px 0",border:"none",background:"none",cursor:"pointer",
              color:tab===id?T.tabActive:T.textMuted,
              borderBottom:`2.5px solid ${tab===id?T.tabActive:"transparent"}`,
              transition:"all 0.15s",
            }}
            onClick={()=>setTab(id)}>
            <span style={{fontSize:20}}>{ic}</span>
            <span style={{fontSize:12,marginTop:2,fontWeight:tab===id?700:400}}>{lb}</span>
          </button>
        ))}
      </div>

      {/* ════════ ORDER TAB ════════ */}
      {tab==="order"&&(
        <div style={{paddingTop:4}}>
          <Sect title="ลูกค้าประเภทไหน?" T={T}>
            <div style={{display:"flex",gap:8}}>
              {CUST.map(c=>(
                <button key={c.id} className="tap"
                  style={{
                    flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                    padding:"12px 4px",borderRadius:12,cursor:"pointer",
                    border:`1.5px solid ${custType===c.id?c.color:T.ctypeBorder}`,
                    background:custType===c.id?(isDark?`${c.color}22`:`${c.color}12`):T.ctypeBg,
                    transition:"all 0.15s",
                  }}
                  onClick={()=>{setCustType(c.id);setOverPrice("");}}>
                  <span style={{fontSize:22}}>{c.icon}</span>
                  <span style={{fontWeight:700,fontSize:12,marginTop:4,color:custType===c.id?c.color:T.textSub,textAlign:"center"}}>{c.th}</span>
                </button>
              ))}
            </div>
          </Sect>

          <Sect title="ข้อมูลลูกค้า (ถ้ามี)" T={T}>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}>
                <SLabel T={T}>ชื่อหรือเบอร์โทร</SLabel>
                <input style={inp} placeholder="เช่น สมชาย / 081-xxx" value={custName} onChange={e=>setCustName(e.target.value)}/>
              </div>
              <div style={{flex:1}}>
                <SLabel T={T}>ยี่ห้อ/รุ่นรถ</SLabel>
                <input style={inp} placeholder="Honda Wave…" value={bike} onChange={e=>setBike(e.target.value)}/>
              </div>
            </div>
          </Sect>

          <Sect title="เลือกอะไหล่" T={T}>
            {/* Search */}
            <div className="sw" style={{position:"relative",marginBottom:10}}>
              <SLabel T={T}>ชื่ออะไหล่</SLabel>
              <input ref={searchRef} style={inp} placeholder="พิมพ์ชื่ออะไหล่…"
                value={search} onChange={e=>doSearch(e.target.value)}
                onFocus={()=>sugg.length>0&&setShowDrop(true)}
                onKeyDown={e=>{if(e.key==="Enter"&&selPart)addLine();if(e.key==="Escape")setShowDrop(false);}}/>
              {showDrop&&(
                <div style={{
                  position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:100,
                  background:T.dropBg,border:`1.5px solid ${T.dropBorder}`,borderRadius:12,
                  boxShadow:T.shadowMd,maxHeight:240,overflowY:"auto",
                }}>
                  {sugg.map(p=>(
                    <div key={p.id} className="drop-item"
                      style={{padding:"11px 14px",cursor:"pointer",borderBottom:`1px solid ${T.divider}`,transition:"background 0.1s"}}
                      onMouseDown={()=>pickPart(p)}>
                      <div style={{fontWeight:700,fontSize:14,color:T.text}}>{p.name}</div>
                      <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                        {CUST.map(c=>(
                          <span key={c.id} style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,
                            color:c.color,background:isDark?`${c.color}20`:`${c.color}12`}}>
                            {c.th}: {fmt(catPrice(p,c.id))}฿
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price hint */}
            {selPart&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                background:T.hintBg,borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                <span style={{fontSize:13,color:T.textSub}}>
                  ราคา{CUST.find(c=>c.id===custType)?.th}:
                </span>
                <span style={{fontSize:22,fontWeight:800,color:CUST.find(c=>c.id===custType)?.color}}>
                  {fmt(catPrice(selPart,custType))} ฿
                </span>
              </div>
            )}

            {/* Qty + override + note */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <div style={{flex:"0 0 auto"}}>
                <SLabel T={T}>จำนวน</SLabel>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <QBtn onClick={()=>setQty(q=>Math.max(1,q-1))} T={T}>−</QBtn>
                  <input style={{...inp,width:52,textAlign:"center"}} type="number" min="1"
                    value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))}/>
                  <QBtn onClick={()=>setQty(q=>q+1)} T={T}>+</QBtn>
                </div>
              </div>
              <div style={{flex:1,minWidth:100}}>
                <SLabel T={T}>ราคาพิเศษ (ถ้ามี)</SLabel>
                <input style={inp} type="number" min="0"
                  placeholder={selPart?String(catPrice(selPart,custType)):"—"}
                  value={overPrice} onChange={e=>setOverPrice(e.target.value)}/>
              </div>
              <div style={{flex:2,minWidth:130}}>
                <SLabel T={T}>หมายเหตุ</SLabel>
                <input style={inp} placeholder="อะไหล่แท้ / ลูกค้านำมาเอง…" value={note} onChange={e=>setNote(e.target.value)}/>
              </div>
            </div>

            {selPart&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                background:T.previewBg,borderRadius:10,padding:"12px 14px",marginTop:10}}>
                <span style={{color:T.textSub,fontSize:14}}>{selPart.name} × {qty}</span>
                <span style={{fontWeight:800,fontSize:22,color:T.tabActive}}>{fmt(lineTotal)} ฿</span>
              </div>
            )}

            <button className="tap"
              style={{width:"100%",marginTop:10,padding:"14px",borderRadius:11,border:"none",
                background:selPart?"#3b82f6":"#94a3b8",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",
                opacity:selPart?1:0.6,transition:"background 0.2s"}}
              disabled={!selPart} onClick={addLine}>
              ➕ เพิ่มรายการ
            </button>
          </Sect>

          {/* Order lines */}
          <Sect title={`รายการในออเดอร์ (${lines.length} รายการ)`} T={T}>
            {lines.length===0?(
              <div style={{textAlign:"center",color:T.textMuted,padding:"28px 16px",fontSize:14,lineHeight:"1.7"}}>
                ยังไม่มีรายการ<br/>เลือกอะไหล่ด้านบนได้เลย
              </div>
            ):(
              <>
                {lines.map((ln,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                    padding:"12px 0",borderBottom:`1px solid ${T.lineDivider}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15,color:T.text}}>{ln.partName}</div>
                      <div style={{color:T.textSub,fontSize:13,marginTop:2}}>
                        {ln.qty} ชิ้น × {fmt(ln.unitPrice)}฿
                        {ln.note&&<span style={{marginLeft:6,color:T.textMuted}}>({ln.note})</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:700,fontSize:16,color:T.tabActive}}>{fmt(ln.total)}฿</span>
                      <button style={{background:"none",border:`1.5px solid ${T.delBorder}`,
                        color:T.delColor,borderRadius:8,padding:"5px 10px",fontSize:13,fontWeight:600,cursor:"pointer"}}
                        onClick={()=>setLines(l=>l.filter((_,idx)=>idx!==i))}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:isDark?"#22262f":"#f8fafc",borderRadius:10,padding:"14px",marginTop:10}}>
                  <span style={{fontSize:15,color:T.textSub,fontWeight:600}}>ยอดรวม</span>
                  <span style={{fontSize:26,fontWeight:800,color:T.text}}>{fmt(txTotal)} ฿</span>
                </div>
                <button className="tap"
                  style={{width:"100%",marginTop:10,padding:"15px",borderRadius:11,border:"none",
                    background:T.saveBg,color:T.saveColor,fontSize:16,fontWeight:700,cursor:"pointer",
                    opacity:saving?0.6:1}}
                  disabled={saving} onClick={saveTransaction}>
                  {saving?"⏳ กำลังบันทึก…":"💾 บันทึกออเดอร์"}
                </button>
              </>
            )}
          </Sect>
        </div>
      )}

      {/* ════════ HISTORY TAB ════════ */}
      {tab==="history"&&(
        <div style={{paddingTop:4}}>
          <Sect title="กรองข้อมูล" T={T}>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <div style={{flex:1}}>
                <SLabel T={T}>เดือน</SLabel>
                <select style={sel} value={fMonth} onChange={e=>setFMonth(e.target.value)}>
                  {(allMonths.length?allMonths:[mk(nowISO())]).map(m=>(
                    <option key={m} value={m}>{mlabel(m)}</option>
                  ))}
                </select>
              </div>
              <div style={{flex:1}}>
                <SLabel T={T}>ประเภทลูกค้า</SLabel>
                <select style={sel} value={fType} onChange={e=>setFType(e.target.value)}>
                  <option value="all">ทุกประเภท</option>
                  {CUST.map(c=><option key={c.id} value={c.id}>{c.th}</option>)}
                </select>
              </div>
            </div>
            <button className="tap"
              style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
                background:"#16a34a",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",
                opacity:xlsxReady&&hRows.length?1:0.4}}
              disabled={!xlsxReady||!hRows.length} onClick={exportMonth}>
              📥 ดาวน์โหลด Excel — {mlabel(fMonth)}
            </button>
          </Sect>

          {/* Summary chips */}
          <div style={{display:"flex",gap:8,padding:"0 14px 10px",flexWrap:"wrap"}}>
            {CUST.map(c=>{
              const r=hRows.filter(o=>o.custType===c.id);
              return (
                <div key={c.id} style={{
                  flex:1,minWidth:90,background:T.card,borderRadius:10,
                  padding:"10px 12px",borderLeft:`3px solid ${c.color}`,
                  boxShadow:T.shadow,
                }}>
                  <div style={{fontSize:11,color:T.textSub,fontWeight:600}}>{c.icon} {c.th}</div>
                  <div style={{fontSize:15,fontWeight:700,color:T.text,marginTop:3}}>{fmt(r.reduce((s,x)=>s+x.total,0))} ฿</div>
                  <div style={{fontSize:11,color:T.textMuted}}>{r.length} ออเดอร์</div>
                </div>
              );
            })}
          </div>

          {loading&&<div style={{textAlign:"center",color:T.textMuted,padding:32}}>⏳ กำลังโหลด…</div>}
          {!loading&&hRows.length===0&&<div style={{textAlign:"center",color:T.textMuted,padding:32}}>ไม่มีข้อมูลในเดือนนี้</div>}

          {hRows.map(tx=>{
            const ct=CUST.find(c=>c.id===tx.custType);
            return (
              <div key={tx.id} style={{...card,margin:"0 14px 10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                    color:ct?.color,background:isDark?`${ct?.color}22`:`${ct?.color}12`}}>
                    {ct?.icon} {ct?.th}
                  </span>
                  <span style={{fontWeight:700,color:T.text}}>{tx.custName}</span>
                  <span style={{color:T.textMuted,fontSize:13}}>🏍️ {tx.bikeBrand}</span>
                  <span style={{color:T.textMuted,fontSize:12,marginLeft:"auto"}}>{tx.date}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
                  <span style={{fontSize:20,fontWeight:800,color:T.text}}>{fmt(tx.total)} ฿</span>
                  <button style={{background:"none",border:`1.5px solid ${T.delBorder}`,
                    color:T.delColor,borderRadius:8,padding:"5px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}
                    onClick={()=>deleteOrder(tx.id)}>🗑️ ลบ</button>
                </div>
                <div style={{marginTop:8,background:isDark?"#12151c":"#f9fafb",borderRadius:8,overflow:"hidden"}}>
                  {tx.lines.map((ln,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      padding:"8px 10px",borderBottom:i<tx.lines.length-1?`1px solid ${T.divider}`:"none"}}>
                      <span style={{fontSize:13,color:T.textSub}}>{ln.partName} × {ln.qty}</span>
                      <span style={{fontSize:13,fontWeight:600,color:T.text}}>{fmt(ln.total)}฿</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {hRows.length>0&&(
            <div style={{...card,margin:"0 14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,color:T.textSub}}>{mlabel(fMonth)} · {hRows.length} ออเดอร์</span>
              <span style={{fontSize:22,fontWeight:800,color:T.text}}>{fmt(hTotal)} ฿</span>
            </div>
          )}
        </div>
      )}

      {/* ════════ PARTS TAB ════════ */}
      {tab==="parts"&&(
        <div style={{paddingTop:4}}>
          <Sect title="เพิ่มอะไหล่ใหม่" T={T}>
            <div style={{marginBottom:10}}>
              <SLabel T={T}>ชื่ออะไหล่</SLabel>
              <input style={inp} placeholder="เช่น ลูกสูบ, ชุดคลัทช์…"
                value={pName} onChange={e=>setPName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addPart()}/>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[
                {label:"ราคาทั่วไป",color:"#3b82f6",val:pR,set:setPR},
                {label:"ราคา DIY",  color:"#22c55e",val:pD,set:setPD},
                {label:"ราคาส่ง",   color:"#f97316",val:pW,set:setPW},
              ].map(f=>(
                <div key={f.label} style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:f.color,marginBottom:4}}>{f.label} ฿</div>
                  <input style={{...inp,borderTop:`2.5px solid ${f.color}`}} type="number" min="0"
                    placeholder="0" value={f.val} onChange={e=>f.set(e.target.value)}/>
                </div>
              ))}
            </div>
            <button className="tap"
              style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
                background:"#3b82f6",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",
                opacity:pSaving?0.6:1}}
              disabled={pSaving} onClick={addPart}>
              {pSaving?"กำลังบันทึก…":"☁️ บันทึกอะไหล่ขึ้น Cloud"}
            </button>
          </Sect>

          <Sect title={`รายการอะไหล่ทั้งหมด (${parts.length} รายการ)`} T={T}>
            {/* Header row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 58px 58px 58px 32px",
              gap:4,paddingBottom:8,borderBottom:`1px solid ${T.divider}`,marginBottom:4}}>
              {[
                {lbl:"ชื่ออะไหล่", c:T.textMuted, r:false},
                {lbl:"ทั่วไป",     c:"#3b82f6",   r:true},
                {lbl:"DIY",        c:"#22c55e",   r:true},
                {lbl:"ส่ง",        c:"#f97316",   r:true},
                {lbl:"",           c:"",           r:true},
              ].map((h,i)=>(
                <div key={i} style={{fontSize:11,fontWeight:700,color:h.c,textAlign:h.r?"right":"left"}}>{h.lbl}</div>
              ))}
            </div>
            {!partsLoaded&&<div style={{textAlign:"center",color:T.textMuted,padding:24}}>⏳ กำลังโหลด…</div>}
            {parts.map(p=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 58px 58px 58px 32px",
                gap:4,padding:"9px 0",borderBottom:`1px solid ${T.divider}`,alignItems:"center"}}>
                <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p.name}</div>
                <div style={{textAlign:"right",fontSize:13,color:"#3b82f6",fontWeight:600}}>{fmt(p.retailPrice)}</div>
                <div style={{textAlign:"right",fontSize:13,color:"#22c55e",fontWeight:600}}>{fmt(p.diyPrice)}</div>
                <div style={{textAlign:"right",fontSize:13,color:"#f97316",fontWeight:600}}>{fmt(p.wholesalePrice)}</div>
                <div style={{textAlign:"right"}}>
                  <button style={{background:"none",border:"none",color:T.delColor,cursor:"pointer",fontSize:16,padding:"2px"}}
                    onClick={()=>deletePart(p.id)}>✕</button>
                </div>
              </div>
            ))}
          </Sect>
        </div>
      )}
    </div>
  );
}

// ─── Mini components ──────────────────────────────────────────────────────────
const Sect = ({title,children,T})=>(
  <div style={{padding:"10px 14px 0"}}>
    <div style={{fontSize:10,fontWeight:700,color:T.sectLabel,textTransform:"uppercase",
      letterSpacing:"0.8px",marginBottom:7}}>{title}</div>
    <div style={{background:T.card,borderRadius:14,padding:"14px",marginBottom:10,
      boxShadow:T.shadow,border:`1px solid ${T.cardBorder}`}}>
      {children}
    </div>
  </div>
);
const SLabel = ({children,T})=>(
  <div style={{fontSize:11,fontWeight:700,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.3px"}}>
    {children}
  </div>
);
const QBtn = ({onClick,children,T})=>(
  <button className="tap"
    style={{width:38,height:38,borderRadius:9,border:`1.5px solid ${T.ctypeBorder}`,
      background:T.ctypeBg,fontSize:20,cursor:"pointer",display:"flex",
      alignItems:"center",justifyContent:"center",flexShrink:0,color:T.text}}
    onClick={onClick}>{children}</button>
);
