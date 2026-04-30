import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── โหลด SheetJS ──────────────────────────────────────────────────────────
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

// ── ประเภทลูกค้า ─────────────────────────────────────────────────────────
const CUST_TYPES = [
  { id:"retail",    label:"ลูกค้าทั่วไป",       sub:"ราคาเต็ม + ค่าแรง",      color:"#4fc3f7", icon:"🔧", priceKey:"retailPrice"    },
  { id:"diy",       label:"ซื้อเอง/เปลี่ยนเอง", sub:"ซื้ออะไหล่ ราคา DIY",    color:"#81c784", icon:"🛠️", priceKey:"diyPrice"       },
  { id:"wholesale", label:"ร้านค้า/ส่ง",         sub:"ราคาส่ง ลดพิเศษ",        color:"#ffb74d", icon:"🏪", priceKey:"wholesalePrice" },
];

// ── รายการอะไหล่เริ่มต้น (3 ราคาแยกกัน) ─────────────────────────────────
const DEFAULT_PARTS = [
  { name:"ไส้กรองน้ำมันเครื่อง",    retailPrice:120,  diyPrice:110,  wholesalePrice:80   },
  { name:"หัวเทียน",                retailPrice:85,   diyPrice:78,   wholesalePrice:55   },
  { name:"ผ้าเบรกหน้า",             retailPrice:350,  diyPrice:320,  wholesalePrice:220  },
  { name:"ผ้าเบรกหลัง",             retailPrice:280,  diyPrice:260,  wholesalePrice:180  },
  { name:"โซ่ขับเคลื่อน",           retailPrice:480,  diyPrice:450,  wholesalePrice:320  },
  { name:"ชุดสเตอร์",               retailPrice:650,  diyPrice:600,  wholesalePrice:420  },
  { name:"ไส้กรองอากาศ",            retailPrice:180,  diyPrice:165,  wholesalePrice:120  },
  { name:"น้ำมันเครื่อง (1L)",       retailPrice:220,  diyPrice:205,  wholesalePrice:150  },
  { name:"ยางหน้า",                 retailPrice:950,  diyPrice:900,  wholesalePrice:700  },
  { name:"ยางหลัง",                 retailPrice:1100, diyPrice:1050, wholesalePrice:820  },
  { name:"แบตเตอรี่",               retailPrice:890,  diyPrice:850,  wholesalePrice:650  },
  { name:"สายคลัทช์",               retailPrice:150,  diyPrice:140,  wholesalePrice:100  },
  { name:"สายคันเร่ง",              retailPrice:140,  diyPrice:130,  wholesalePrice:95   },
  { name:"สายเบรก",                 retailPrice:130,  diyPrice:120,  wholesalePrice:88   },
  { name:"หลอดไฟหน้า",              retailPrice:95,   diyPrice:88,   wholesalePrice:60   },
  { name:"หลอดไฟเลี้ยว",            retailPrice:35,   diyPrice:32,   wholesalePrice:22   },
  { name:"จานเบรกหน้า",             retailPrice:850,  diyPrice:800,  wholesalePrice:600  },
  { name:"โช้คหลัง",                retailPrice:1200, diyPrice:1100, wholesalePrice:880  },
  { name:"หัวคาร์บูเรเตอร์",         retailPrice:75,   diyPrice:70,   wholesalePrice:50   },
  { name:"ไส้กรองน้ำมันเชื้อเพลิง",  retailPrice:110,  diyPrice:100,  wholesalePrice:72   },
];

// ── ชื่อเดือนภาษาไทย ──────────────────────────────────────────────────────
const MONTHS_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                   "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

const fmtN = n => Number(n).toLocaleString("th-TH");
const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()+543}`;
};
const nowISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const monthKey   = iso => iso.slice(0,7);
const monthLabel = key => { const [y,m]=key.split("-"); return `${MONTHS_TH[parseInt(m)-1]} ${parseInt(y)+543}`; };

// ── LocalStorage ──────────────────────────────────────────────────────────
const STORE_KEY = "moto_shop_orders_v3";
const PARTS_KEY = "moto_shop_parts_v3";
const loadOrders = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY))||[]; } catch { return []; } };
const saveOrders = o  => localStorage.setItem(STORE_KEY, JSON.stringify(o));
const loadParts  = () => { try { return JSON.parse(localStorage.getItem(PARTS_KEY))||DEFAULT_PARTS; } catch { return DEFAULT_PARTS; } };
const saveParts  = p  => localStorage.setItem(PARTS_KEY, JSON.stringify(p));

// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const xlsxReady = useXLSX();
  const [tab, setTab] = useState("order");

  const [parts,  setParts]  = useState(loadParts);
  const [orders, setOrders] = useState(loadOrders);
  useEffect(()=>saveParts(parts),   [parts]);
  useEffect(()=>saveOrders(orders), [orders]);

  const [custType,    setCustType]    = useState("retail");
  const [custName,    setCustName]    = useState("");
  const [bikeBrand,   setBikeBrand]   = useState("");
  const [search,      setSearch]      = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [selPart,     setSelPart]     = useState(null);
  const [qty,         setQty]         = useState(1);
  const [customPrice, setCustomPrice] = useState("");
  const [note,        setNote]        = useState("");
  const [lines,       setLines]       = useState([]);
  const [editLineIdx, setEditLineIdx] = useState(null);
  const [curDate,     setCurDate]     = useState(todayStr());
  const searchRef = useRef(null);

  const allMonths    = [...new Set(orders.map(o=>monthKey(o.date)))].sort().reverse();
  const [filterMonth,setFilterMonth] = useState(()=>monthKey(nowISO()));
  const [filterType, setFilterType]  = useState("all");

  const [newName,      setNewName]      = useState("");
  const [newRetail,    setNewRetail]    = useState("");
  const [newDiy,       setNewDiy]       = useState("");
  const [newWholesale, setNewWholesale] = useState("");

  useEffect(()=>{ const t=setInterval(()=>setCurDate(todayStr()),60000); return()=>clearInterval(t); },[]);

  const catalogPrice = (p, type) => {
    const key = CUST_TYPES.find(c=>c.id===type)?.priceKey||"retailPrice";
    return p[key]??p.retailPrice;
  };

  const handleSearch = val => {
    setSearch(val); setSelPart(null);
    if (!val.trim()){ setSuggestions([]); setShowDrop(false); return; }
    const q=val.toLowerCase();
    const hits=parts.filter(p=>p.name.toLowerCase().includes(q));
    setSuggestions(hits); setShowDrop(hits.length>0);
  };
  const pickPart = p => { setSelPart(p); setSearch(p.name); setCustomPrice(""); setSuggestions([]); setShowDrop(false); };

  const getUnitPrice = useCallback(()=>{
    if (customPrice!==""&&!isNaN(Number(customPrice))) return Number(customPrice);
    if (!selPart) return 0;
    return catalogPrice(selPart, custType);
  },[selPart,custType,customPrice]);

  const lineTotal = getUnitPrice()*qty;

  const addLine = () => {
    if (!selPart) return;
    const line = { partName:selPart.name, qty, unitPrice:getUnitPrice(), total:getUnitPrice()*qty, note };
    if (editLineIdx!==null){ setLines(l=>l.map((x,i)=>i===editLineIdx?line:x)); setEditLineIdx(null); }
    else setLines(l=>[...l,line]);
    setSearch(""); setSelPart(null); setQty(1); setCustomPrice(""); setNote("");
    searchRef.current?.focus();
  };

  const loadOrdersFromDB = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_lines(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const formatted = data.map(o => ({
    id: o.id,
    date: o.created_at,
    custType: o.cust_type,
    custName: o.cust_name,
    bikeBrand: o.bike_brand,
    total: o.total,
    lines: o.order_lines.map(l => ({
      partName: l.part_name,
      qty: l.qty,
      unitPrice: l.unit_price,
      total: l.total,
      note: l.note
    }))
  }));

  setOrders(formatted);
};

  const txTotal = lines.reduce((s,l)=>s+l.total,0);

  const saveTransaction = async () => {
  if (!lines.length) return;

  // 1. บันทึก order
  const { data: order, error } = await supabase
    .from("orders")
    .insert([{
      cust_type: custType,
      cust_name: custName || "—",
      bike_brand: bikeBrand || "—",
      total: txTotal
    }])
    .select()
    .single();

  if (error) {
    alert("บันทึกไม่สำเร็จ ❌");
    console.error(error);
    return;
  }

  // 2. บันทึกรายการอะไหล่
  const lineData = lines.map(l => ({
    order_id: order.id,
    part_name: l.partName,
    qty: l.qty,
    unit_price: l.unitPrice,
    total: l.total,
    note: l.note
  }));

  const { error: lineError } = await supabase
    .from("order_lines")
    .insert(lineData);

  if (lineError) {
    alert("บันทึกสินค้าไม่สำเร็จ ❌");
    console.error(lineError);
    return;
  }

  alert("บันทึกสำเร็จ ✅");

  setLines([]);
  setCustName("");
  setBikeBrand("");

  // โหลดใหม่
  loadOrdersFromDB();
};

  // ── Export Excel รายเดือน แยกชีทตามประเภทลูกค้า ───────────────
  const exportMonth = mk => {
    if (!window.XLSX) return;
    const XLSX = window.XLSX;
    const wb   = XLSX.utils.book_new();
    const mo   = orders.filter(o=>monthKey(o.date)===mk);
    const sheetNames = { retail:"ลูกค้าทั่วไป", diy:"ซื้อเอง-DIY", wholesale:"ร้านค้า-ส่ง" };
    const hdrs = ["วันที่","ชื่อลูกค้า","รถ","ชื่ออะไหล่","จำนวน","ราคาต่อชิ้น","รวมต่อรายการ","หมายเหตุ","ยอดรวมออเดอร์"];

    ["retail","diy","wholesale"].forEach(t=>{
      const rows=mo.filter(o=>o.custType===t);
      if (!rows.length) return;
      const data=[hdrs];
      rows.forEach(tx=>{
        tx.lines.forEach((ln,i)=>{
          data.push([tx.date, tx.custName, tx.bikeBrand,
            ln.partName, ln.qty, ln.unitPrice, ln.total, ln.note||"",
            i===0?tx.total:""]);
        });
        data.push([]);
      });
      const gt=rows.reduce((s,r)=>s+r.total,0);
      data.push(["","","","","","","ยอดรวมเดือน","",gt]);
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws["!cols"]=[12,16,14,24,6,13,14,18,15].map(w=>({wch:w}));
      XLSX.utils.book_append_sheet(wb,ws,sheetNames[t]);
    });

    // ชีทสรุปรวม
    const sumData=[["ประเภทลูกค้า","จำนวนออเดอร์","ยอดรวม (฿)"]];
    ["retail","diy","wholesale"].forEach(t=>{
      const rows=mo.filter(o=>o.custType===t);
      sumData.push([sheetNames[t], rows.length, rows.reduce((s,r)=>s+r.total,0)]);
    });
    sumData.push([]);
    sumData.push(["รวมทั้งหมด","",mo.reduce((s,r)=>s+r.total,0)]);
    const wsSum=XLSX.utils.aoa_to_sheet(sumData);
    wsSum["!cols"]=[{wch:18},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb,wsSum,"สรุปรายเดือน");

    XLSX.writeFile(wb,`MotoShop_${mk}.xlsx`);
  };

  useEffect(() => {
   loadOrdersFromDB();
}, []);

  const historyRows  = orders.filter(o=>monthKey(o.date)===filterMonth&&(filterType==="all"||o.custType===filterType)).sort((a,b)=>b.id-a.id);
  const historyTotal = historyRows.reduce((s,o)=>s+o.total,0);

  const addPart = () => {
    if (!newName.trim()) return;
    setParts(p=>[...p,{name:newName.trim(),retailPrice:Number(newRetail)||0,diyPrice:Number(newDiy)||0,wholesalePrice:Number(newWholesale)||0}]);
    setNewName(""); setNewRetail(""); setNewDiy(""); setNewWholesale("");
  };
  const deletePart = i => { if (confirm("ลบอะไหล่นี้ออกจากรายการ?")) setParts(p=>p.filter((_,idx)=>idx!==i)); };

  // ════════════ RENDER ════════════════════════════════════════════
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
        *{box-sizing:border-box;} body{margin:0;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3;}
        .di:hover{background:rgba(255,152,0,0.15)!important;}
        .tb:hover{opacity:1!important;}
        .rh:hover{background:rgba(255,255,255,0.035)!important;}
        .ib:hover{opacity:1!important;transform:scale(1.18);}
        .ct:hover{border-color:rgba(255,255,255,0.4)!important;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2);}
        ::-webkit-scrollbar-thumb{background:#555;border-radius:3px;}
      `}</style>

      {/* HEADER */}
      <header style={S.header}>
        <div style={S.hInner}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <span style={{fontSize:32}}>🏍️</span>
            <div>
              <div style={S.bName}>ร้านอะไหล่และซ่อมรถมอเตอร์ไซค์</div>
              <div style={S.bSub}>ระบบบันทึกการขายและออเดอร์</div>
            </div>
          </div>
          <div style={S.datePill}>{curDate}</div>
        </div>
        <div style={S.tabs}>
          {[["order","📝 บันทึกออเดอร์"],["history","📊 ประวัติการขาย"],["parts","⚙️ รายการอะไหล่"]].map(([id,lbl])=>(
            <button key={id} className="tb" style={{...S.tab,...(tab===id?S.tabOn:{})}} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
      </header>

      <main style={S.main}>

        {/* ══ บันทึกออเดอร์ ══ */}
        {tab==="order"&&(
          <div style={S.twoCol}>
            <div>
              {/* ประเภทลูกค้า */}
              <div style={S.card}>
                <div style={S.cTitle}>ประเภทลูกค้า</div>
                <div style={{display:"flex",gap:10}}>
                  {CUST_TYPES.map(ct=>(
                    <button key={ct.id} className="ct"
                      style={{...S.ctBtn,...(custType===ct.id?{...S.ctOn,borderColor:ct.color}:{})}}
                      onClick={()=>{setCustType(ct.id);setCustomPrice("");}}>
                      <div style={{fontSize:22}}>{ct.icon}</div>
                      <div style={{fontWeight:700,color:custType===ct.id?ct.color:"#ccc",fontSize:14}}>{ct.label}</div>
                      <div style={{fontSize:11,color:"#777",marginTop:2}}>{ct.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ข้อมูลลูกค้า */}
              <div style={S.card}>
                <div style={S.cTitle}>ข้อมูลลูกค้า</div>
                <div style={S.row2}>
                  <div style={{flex:1}}>
                    <label style={S.lbl}>ชื่อลูกค้า <Opt/></label>
                    <input style={S.inp} placeholder="ชื่อหรือเบอร์โทร…" value={custName} onChange={e=>setCustName(e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={S.lbl}>ยี่ห้อ/รุ่นรถ <Opt/></label>
                    <input style={S.inp} placeholder="เช่น Honda Wave, Yamaha…" value={bikeBrand} onChange={e=>setBikeBrand(e.target.value)}/>
                  </div>
                </div>
              </div>

              {/* เพิ่มอะไหล่ */}
              <div style={S.card}>
                <div style={S.cTitle}>{editLineIdx!==null?"✏️ แก้ไขรายการ":"➕ เพิ่มอะไหล่"}</div>
                <div className="srch-wrap" style={{position:"relative",marginBottom:12}}>
                  <label style={S.lbl}>ชื่ออะไหล่</label>
                  <input ref={searchRef} style={S.inp} placeholder="พิมพ์ชื่ออะไหล่…"
                    value={search} onChange={e=>handleSearch(e.target.value)}
                    onFocus={()=>suggestions.length>0&&setShowDrop(true)}
                    onKeyDown={e=>{if(e.key==="Enter"&&selPart)addLine();if(e.key==="Escape")setShowDrop(false);}}/>
                  {showDrop&&(
                    <div style={S.drop}>
                      {suggestions.map(p=>(
                        <div key={p.name} className="di" style={S.dropItem} onMouseDown={()=>pickPart(p)}>
                          <span style={{fontWeight:700}}>{p.name}</span>
                          <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                            <span style={{...S.chip,color:"#4fc3f7"}}>ทั่วไป: {fmtN(p.retailPrice)}฿</span>
                            <span style={{...S.chip,color:"#81c784"}}>DIY: {fmtN(p.diyPrice)}฿</span>
                            <span style={{...S.chip,color:"#ffb74d"}}>ส่ง: {fmtN(p.wholesalePrice)}฿</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selPart&&(
                  <div style={S.priceHint}>
                    <span>📌 ราคา{CUST_TYPES.find(c=>c.id===custType)?.label}: </span>
                    <strong style={{color:"#ff9800"}}>{fmtN(catalogPrice(selPart,custType))}฿</strong>
                    {custType!=="retail"&&selPart.retailPrice>0&&(
                      <span style={{color:"#aaa",fontSize:11,marginLeft:8}}>
                        (ลด {Math.round((1-catalogPrice(selPart,custType)/selPart.retailPrice)*100)}% จากราคาปกติ)
                      </span>
                    )}
                  </div>
                )}

                <div style={{...S.row2,marginTop:12,flexWrap:"wrap"}}>
                  <div>
                    <label style={S.lbl}>จำนวน</label>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <button style={S.qb} onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button>
                      <input style={{...S.inp,textAlign:"center",width:60,flexShrink:0}} type="number" min="1" value={qty}
                        onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))}/>
                      <button style={S.qb} onClick={()=>setQty(q=>q+1)}>+</button>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <label style={S.lbl}>ราคาพิเศษ <Opt/></label>
                    <input style={S.inp} type="number" min="0"
                      placeholder={selPart?String(catalogPrice(selPart,custType)):"—"}
                      value={customPrice} onChange={e=>setCustomPrice(e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={S.lbl}>หมายเหตุ <Opt/></label>
                    <input style={S.inp} placeholder="เช่น อะไหล่แท้ / ลูกค้านำมาเอง…"
                      value={note} onChange={e=>setNote(e.target.value)}/>
                  </div>
                </div>

                {selPart&&(
                  <div style={S.preview}>
                    <span style={{color:"#ccc"}}>{selPart.name} × {qty}</span>
                    <span style={{fontWeight:800,fontSize:20,color:"#ff9800"}}>{fmtN(lineTotal)} ฿</span>
                  </div>
                )}

                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
                  {editLineIdx!==null&&(
                    <button style={S.btnSec} onClick={()=>{setEditLineIdx(null);setSearch("");setSelPart(null);setQty(1);setCustomPrice("");setNote("");}}>ยกเลิก</button>
                  )}
                  <button style={{...S.btnOrange,opacity:selPart?1:0.4}} disabled={!selPart} onClick={addLine}>
                    {editLineIdx!==null?"อัปเดตรายการ":"เพิ่มรายการ"}
                  </button>
                </div>
              </div>
            </div>

            {/* ขวา: รายการออเดอร์ */}
            <div>
              <div style={{...S.card,position:"sticky",top:16}}>
                <div style={S.cTitle}>
                  🧾 รายการในออเดอร์
                  <span style={{marginLeft:6,...badge(custType)}}>{CUST_TYPES.find(c=>c.id===custType)?.label}</span>
                </div>

                {lines.length===0?(
                  <div style={S.empty}>ยังไม่มีรายการ</div>
                ):(
                  <div style={{overflowX:"auto"}}>
                    <table style={S.tbl}>
                      <thead><tr>{["อะไหล่","จำนวน","ราคา/ชิ้น","รวม","หมายเหตุ",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {lines.map((ln,i)=>(
                          <tr key={i} className="rh" style={{...S.tr,...(editLineIdx===i?{background:"rgba(255,152,0,0.07)"}:{})}}>
                            <td style={S.td}>{ln.partName}</td>
                            <td style={{...S.td,textAlign:"center"}}>{ln.qty}</td>
                            <td style={{...S.td,textAlign:"right"}}>{fmtN(ln.unitPrice)}฿</td>
                            <td style={{...S.td,textAlign:"right",fontWeight:700,color:"#ff9800"}}>{fmtN(ln.total)}฿</td>
                            <td style={{...S.td,color:"#888",fontSize:12}}>{ln.note||""}</td>
                            <td style={{...S.td,whiteSpace:"nowrap"}}>
                              <button className="ib" style={S.ib} onClick={()=>{
                                setEditLineIdx(i);
                                const p=parts.find(x=>x.name===ln.partName);
                                setSelPart(p||null); setSearch(ln.partName); setQty(ln.qty); setNote(ln.note||"");
                                const cat=p?catalogPrice(p,custType):0;
                                setCustomPrice(ln.unitPrice!==cat?String(ln.unitPrice):"");
                              }}>✏️</button>
                              <button className="ib" style={S.ib} onClick={()=>setLines(l=>l.filter((_,idx)=>idx!==i))}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={S.totalBar}>
                  <span>ยอดรวมออเดอร์นี้</span>
                  <span style={{fontWeight:900,fontSize:22,color:"#ff9800"}}>{fmtN(txTotal)} ฿</span>
                </div>
                <button style={{...S.btnSave,opacity:lines.length?1:0.4,width:"100%"}} disabled={!lines.length} onClick={saveTransaction}>
                  💾 บันทึกออเดอร์
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ประวัติการขาย ══ */}
        {tab==="history"&&(
          <div>
            <div style={S.card}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",marginBottom:18}}>
                <div>
                  <label style={S.lbl}>เดือน</label>
                  <select style={S.sel} value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
                    {allMonths.length===0&&<option value={monthKey(nowISO())}>{monthLabel(monthKey(nowISO()))}</option>}
                    {allMonths.map(mk=><option key={mk} value={mk}>{monthLabel(mk)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.lbl}>ประเภทลูกค้า</label>
                  <select style={S.sel} value={filterType} onChange={e=>setFilterType(e.target.value)}>
                    <option value="all">ทั้งหมด</option>
                    {CUST_TYPES.map(ct=><option key={ct.id} value={ct.id}>{ct.label}</option>)}
                  </select>
                </div>
                <button style={{...S.btnGreen,marginLeft:"auto",opacity:xlsxReady&&historyRows.length?1:0.4}}
                  disabled={!xlsxReady||!historyRows.length}
                  onClick={()=>exportMonth(filterMonth)}>
                  📥 Export {monthLabel(filterMonth)} → Excel
                </button>
              </div>

              {/* สรุปยอดต่อประเภท */}
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {CUST_TYPES.map(ct=>{
                  const rows=historyRows.filter(o=>o.custType===ct.id);
                  return (
                    <div key={ct.id} style={{...S.summChip,borderColor:ct.color}}>
                      <span style={{color:ct.color,fontWeight:700}}>{ct.icon} {ct.label}</span>
                      <span style={{color:"#aaa",marginLeft:8}}>{rows.length} ออเดอร์ · {fmtN(rows.reduce((s,r)=>s+r.total,0))}฿</span>
                    </div>
                  );
                })}
              </div>

              {historyRows.length===0?(
                <div style={S.empty}>ไม่มีข้อมูลในช่วงเวลานี้</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {historyRows.map(tx=>{
                    const ct=CUST_TYPES.find(c=>c.id===tx.custType);
                    return (
                      <div key={tx.id} style={S.txCard}>
                        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                          <span style={badge(tx.custType)}>{ct?.icon} {ct?.label}</span>
                          <span style={{fontWeight:700}}>{tx.custName}</span>
                          <span style={{color:"#888",fontSize:13}}>🏍️ {tx.bikeBrand}</span>
                          <span style={{color:"#777",fontSize:12,marginLeft:"auto"}}>{tx.date}</span>
                        </div>
                        <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center"}}>
                          <span style={{fontWeight:800,fontSize:17,color:"#ff9800"}}>{fmtN(tx.total)} ฿</span>
                          <button style={{...S.btnDanger,padding:"3px 10px",fontSize:12}}
                            onClick={()=>{if(confirm("ลบออเดอร์นี้?"))setOrders(o=>o.filter(x=>x.id!==tx.id));}}>ลบ</button>
                        </div>
                        <table style={{...S.tbl,marginTop:8}}>
                          <thead><tr>{["ชื่ออะไหล่","จำนวน","ราคา/ชิ้น","รวม","หมายเหตุ"].map(h=><th key={h} style={{...S.th,fontSize:11}}>{h}</th>)}</tr></thead>
                          <tbody>
                            {tx.lines.map((ln,i)=>(
                              <tr key={i} style={S.tr}>
                                <td style={S.td}>{ln.partName}</td>
                                <td style={{...S.td,textAlign:"center"}}>{ln.qty}</td>
                                <td style={{...S.td,textAlign:"right"}}>{fmtN(ln.unitPrice)}฿</td>
                                <td style={{...S.td,textAlign:"right",fontWeight:700,color:"#ff9800"}}>{fmtN(ln.total)}฿</td>
                                <td style={{...S.td,color:"#888",fontSize:12}}>{ln.note||""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              {historyRows.length>0&&(
                <div style={{...S.totalBar,marginTop:18}}>
                  <span>{monthLabel(filterMonth)} · {filterType==="all"?"ทุกประเภท":CUST_TYPES.find(c=>c.id===filterType)?.label} · {historyRows.length} ออเดอร์</span>
                  <span style={{fontWeight:900,fontSize:20,color:"#ff9800"}}>{fmtN(historyTotal)} ฿</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ รายการอะไหล่ ══ */}
        {tab==="parts"&&(
          <div>
            <div style={S.card}>
              <div style={S.cTitle}>เพิ่มอะไหล่ใหม่</div>
              <div style={{...S.row2,flexWrap:"wrap",gap:10}}>
                <div style={{flex:"2 1 150px"}}>
                  <label style={S.lbl}>ชื่ออะไหล่</label>
                  <input style={S.inp} placeholder="เช่น ลูกสูบ, ชุดคลัทช์…" value={newName}
                    onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPart()}/>
                </div>
                <div style={{flex:"1 1 90px"}}>
                  <label style={S.lbl}>ราคาทั่วไป (฿)</label>
                  <input style={S.inp} type="number" min="0" placeholder="0" value={newRetail} onChange={e=>setNewRetail(e.target.value)}/>
                </div>
                <div style={{flex:"1 1 90px"}}>
                  <label style={S.lbl}>ราคา DIY (฿)</label>
                  <input style={S.inp} type="number" min="0" placeholder="0" value={newDiy} onChange={e=>setNewDiy(e.target.value)}/>
                </div>
                <div style={{flex:"1 1 90px"}}>
                  <label style={S.lbl}>ราคาส่ง (฿)</label>
                  <input style={S.inp} type="number" min="0" placeholder="0" value={newWholesale} onChange={e=>setNewWholesale(e.target.value)}/>
                </div>
                <div style={{display:"flex",alignItems:"flex-end"}}>
                  <button style={S.btnOrange} onClick={addPart}>เพิ่ม</button>
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cTitle}>รายการอะไหล่ทั้งหมด ({parts.length} รายการ)</div>
              <div style={{overflowX:"auto"}}>
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      {[
                        {lbl:"#",           color:"#888"},
                        {lbl:"ชื่ออะไหล่",  color:"#e8e4dc"},
                        {lbl:"ราคาทั่วไป",  color:"#4fc3f7"},
                        {lbl:"ราคา DIY",    color:"#81c784"},
                        {lbl:"ราคาส่ง",     color:"#ffb74d"},
                        {lbl:"ส่วนลด DIY",  color:"#81c784"},
                        {lbl:"ส่วนลดส่ง",   color:"#ffb74d"},
                        {lbl:"",            color:"#888"},
                      ].map((h,i)=><th key={i} style={{...S.th,color:h.color}}>{h.lbl}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p,i)=>(
                      <tr key={i} className="rh" style={S.tr}>
                        <td style={{...S.td,color:"#555",width:34}}>{i+1}</td>
                        <td style={{...S.td,fontWeight:600}}>{p.name}</td>
                        <td style={{...S.td,textAlign:"right",color:"#4fc3f7"}}>{fmtN(p.retailPrice)} ฿</td>
                        <td style={{...S.td,textAlign:"right",color:"#81c784"}}>{fmtN(p.diyPrice)} ฿</td>
                        <td style={{...S.td,textAlign:"right",color:"#ffb74d"}}>{fmtN(p.wholesalePrice)} ฿</td>
                        <td style={{...S.td,textAlign:"right",color:"#81c784",fontSize:12}}>
                          {p.retailPrice>0?`-${Math.round((1-p.diyPrice/p.retailPrice)*100)}%`:"—"}
                        </td>
                        <td style={{...S.td,textAlign:"right",color:"#ffb74d",fontSize:12}}>
                          {p.retailPrice>0?`-${Math.round((1-p.wholesalePrice/p.retailPrice)*100)}%`:"—"}
                        </td>
                        <td style={S.td}>
                          <button className="ib" style={S.ib} onClick={()=>deletePart(i)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const Opt = () => <span style={{color:"#555",fontStyle:"italic",fontSize:10,marginLeft:3}}>(ไม่บังคับ)</span>;

const badge = type => {
  const c={retail:"#4fc3f7",diy:"#81c784",wholesale:"#ffb74d"}[type]||"#aaa";
  return { background:`${c}18`, border:`1px solid ${c}44`, color:c, borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:700 };
};

const S = {
  page:     { minHeight:"100vh", background:"#111418", fontFamily:"'Sarabun',sans-serif", color:"#e8e4dc", fontSize:14 },
  header:   { background:"#1a1d22", borderBottom:"2px solid #ff9800" },
  hInner:   { maxWidth:1120, margin:"0 auto", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  bName:    { fontSize:20, fontWeight:700, color:"#ff9800" },
  bSub:     { fontSize:12, color:"#888", marginTop:2 },
  datePill: { background:"rgba(255,152,0,0.12)", border:"1px solid rgba(255,152,0,0.4)", borderRadius:20, padding:"6px 16px", fontWeight:700, color:"#ff9800" },
  tabs:     { maxWidth:1120, margin:"0 auto", display:"flex", padding:"0 20px" },
  tab:      { padding:"10px 20px", border:"none", background:"none", color:"#888", fontWeight:600, fontSize:13, cursor:"pointer", borderBottom:"3px solid transparent", transition:"all 0.2s", fontFamily:"'Sarabun',sans-serif", opacity:0.7 },
  tabOn:    { color:"#ff9800", borderBottom:"3px solid #ff9800", opacity:1 },
  main:     { maxWidth:1120, margin:"0 auto", padding:"22px 20px" },
  twoCol:   { display:"grid", gridTemplateColumns:"1fr 370px", gap:18, alignItems:"start" },
  card:     { background:"#1a1d22", border:"1px solid #2a2d32", borderRadius:12, padding:"18px 20px", marginBottom:14 },
  cTitle:   { fontSize:15, fontWeight:700, color:"#ff9800", marginBottom:14, display:"flex", alignItems:"center", gap:8 },
  ctBtn:    { flex:1, padding:"12px 8px", borderRadius:10, border:"1px solid #333", background:"#111418", cursor:"pointer", textAlign:"center", transition:"all 0.18s", color:"#ccc", fontFamily:"'Sarabun',sans-serif" },
  ctOn:     { background:"rgba(255,152,0,0.08)" },
  lbl:      { display:"block", fontSize:11, color:"#888", marginBottom:4 },
  inp:      { width:"100%", background:"#0e1014", border:"1px solid #2e3138", borderRadius:7, color:"#e8e4dc", padding:"9px 11px", fontSize:13, outline:"none" },
  row2:     { display:"flex", gap:12, alignItems:"flex-start" },
  drop:     { position:"absolute", top:"100%", left:0, right:0, zIndex:200, background:"#1e222a", border:"1px solid #ff9800", borderRadius:10, boxShadow:"0 8px 28px rgba(0,0,0,0.6)", maxHeight:260, overflowY:"auto" },
  dropItem: { padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid #2a2d32" },
  chip:     { background:"rgba(255,255,255,0.07)", borderRadius:5, padding:"2px 7px", fontSize:11, fontWeight:700 },
  priceHint:{ background:"rgba(255,152,0,0.08)", border:"1px solid rgba(255,152,0,0.2)", borderRadius:7, padding:"8px 12px", fontSize:13, color:"#ccc" },
  qb:       { width:34, height:36, borderRadius:7, border:"1px solid #333", background:"#222", color:"#e8e4dc", fontSize:18, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },
  preview:  { background:"rgba(255,152,0,0.08)", border:"1px solid rgba(255,152,0,0.2)", borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 },
  btnOrange:{ background:"linear-gradient(135deg,#ff9800,#e65100)", border:"none", borderRadius:8, color:"#fff", fontWeight:700, fontSize:13, padding:"10px 18px", cursor:"pointer", fontFamily:"'Sarabun',sans-serif", whiteSpace:"nowrap" },
  btnSec:   { background:"rgba(255,255,255,0.07)", border:"1px solid #333", borderRadius:8, color:"#aaa", fontWeight:600, fontSize:13, padding:"10px 14px", cursor:"pointer" },
  btnSave:  { background:"linear-gradient(135deg,#1976d2,#0d47a1)", border:"none", borderRadius:9, color:"#fff", fontWeight:700, fontSize:14, padding:"13px 0", cursor:"pointer", marginTop:14, fontFamily:"'Sarabun',sans-serif" },
  btnGreen: { background:"linear-gradient(135deg,#43a047,#1b5e20)", border:"none", borderRadius:8, color:"#fff", fontWeight:700, fontSize:13, padding:"10px 16px", cursor:"pointer" },
  btnDanger:{ background:"rgba(198,40,40,0.15)", border:"1px solid rgba(198,40,40,0.4)", borderRadius:7, color:"#ef5350", fontWeight:600, fontSize:13, padding:"7px 12px", cursor:"pointer" },
  tbl:      { width:"100%", borderCollapse:"collapse" },
  th:       { background:"rgba(255,152,0,0.08)", padding:"8px 10px", textAlign:"left", color:"#ff9800", fontWeight:700, fontSize:11, borderBottom:"1px solid rgba(255,152,0,0.2)" },
  tr:       { borderBottom:"1px solid #1f2228" },
  td:       { padding:"9px 10px", verticalAlign:"middle" },
  ib:       { background:"none", border:"none", cursor:"pointer", fontSize:14, padding:"2px 4px", opacity:0.6, transition:"opacity 0.15s,transform 0.15s" },
  totalBar: { display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,152,0,0.06)", border:"1px solid rgba(255,152,0,0.2)", borderRadius:9, padding:"12px 16px", marginTop:12, fontWeight:600 },
  empty:    { color:"#555", textAlign:"center", padding:"28px 0" },
  sel:      { background:"#0e1014", border:"1px solid #2e3138", borderRadius:7, color:"#e8e4dc", padding:"9px 11px", fontSize:13, outline:"none" },
  summChip: { background:"rgba(255,255,255,0.04)", border:"1px solid", borderRadius:8, padding:"8px 14px", fontSize:13 },
  txCard:   { background:"#111418", border:"1px solid #2a2d32", borderRadius:10, padding:"14px 16px" },
};
