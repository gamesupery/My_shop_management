import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "#f0f2f5",
  fontFamily: "'Sarabun', sans-serif",
  color: "#111827",
  boxSizing: "border-box",
};

const cardStyle = {
  width: "min(100%, 420px)",
  boxSizing: "border-box",
  padding: 28,
  borderRadius: 18,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 12px 36px rgba(15, 23, 42, 0.10)",
};

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "#fff",
  color: "#111827",
  font: "inherit",
  fontSize: 15,
};

function StatusPage({ title, message, action }) {
  return (
    <main style={pageStyle}>
      <section style={{ ...cardStyle, textAlign: "center" }}>
        <div style={{ fontSize: 38, marginBottom: 12 }} aria-hidden="true">🏍️</div>
        <h1 style={{ fontSize: 21, margin: "0 0 10px", color: "#111827" }}>{title}</h1>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.7 }}>{message}</p>
        {action}
      </section>
    </main>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [membership, setMembership] = useState({ userId: null, status: "idle" });
  const [retryCount, setRetryCount] = useState(0);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
      setLoginError("");
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data?.session ?? null);
      setAuthReady(true);
      if (error) setLoginError("ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    }).catch(() => {
      if (!active) return;
      setSession(null);
      setAuthReady(true);
      setLoginError("เชื่อมต่อระบบเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!supabase || !userId) return undefined;

    let active = true;
    supabase
      .from("shop_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setMembership({ userId, status: error ? "error" : data ? "allowed" : "denied" });
      })
      .catch(() => {
        if (active) setMembership({ userId, status: "error" });
      });

    return () => {
      active = false;
    };
  }, [userId, retryCount]);

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;

    setLoginError("");
    setLoginBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password,
      });
      if (error) setLoginError("เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่าน แล้วลองอีกครั้ง");
    } catch {
      setLoginError("เชื่อมต่อระบบเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoginBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    setSignOutError("");
    const { error } = await supabase.auth.signOut();
    if (error) setSignOutError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
  };

  if (!supabase) {
    return (
      <StatusPage
        title="ยังไม่ได้ตั้งค่าการเชื่อมต่อ"
        message="กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_KEY ใน environment ของ Vercel แล้ว build ใหม่"
      />
    );
  }

  if (!authReady) {
    return <StatusPage title="กำลังตรวจสอบการเข้าสู่ระบบ" message="โปรดรอสักครู่…" />;
  }

  if (!session) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 38, marginBottom: 8 }} aria-hidden="true">🏍️</div>
            <h1 style={{ fontSize: 23, margin: "0 0 6px", color: "#111827" }}>เข้าสู่ระบบร้านค้า</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>สำหรับผู้ที่ได้รับอนุญาตจากเจ้าของร้าน</p>
          </div>

          <form onSubmit={signIn}>
            <div style={{ marginBottom: 15 }}>
              <label htmlFor="login-email" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>อีเมล</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="login-password" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>รหัสผ่าน</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={fieldStyle}
              />
            </div>

            {loginError && (
              <p role="alert" style={{ margin: "0 0 14px", color: "#b91c1c", fontSize: 14, lineHeight: 1.5 }}>{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              style={{
                width: "100%", padding: "12px 14px", border: 0, borderRadius: 9,
                background: loginBusy ? "#64748b" : "#2563eb", color: "white",
                font: "inherit", fontSize: 15, fontWeight: 700,
                cursor: loginBusy ? "wait" : "pointer",
              }}
            >
              {loginBusy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>

          <p style={{ margin: "16px 0 0", textAlign: "center", color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>
            ไม่มีปุ่มสมัครสมาชิก บัญชีผู้ใช้ต้องได้รับการเพิ่มและอนุมัติโดยเจ้าของร้าน
          </p>
        </section>
      </main>
    );
  }

  const accessStatus = membership.userId === userId ? membership.status : "checking";
  if (accessStatus === "checking" || accessStatus === "idle") {
    return <StatusPage title="กำลังตรวจสอบสิทธิ์" message="โปรดรอสักครู่…" />;
  }

  if (accessStatus === "denied") {
    return (
      <StatusPage
        title="บัญชีนี้ยังไม่ได้รับอนุญาต"
        message="กรุณาติดต่อเจ้าของร้านเพื่อเพิ่มสิทธิ์เข้าใช้งาน"
        action={<button type="button" onClick={signOut} style={{ marginTop: 18, padding: "10px 16px", border: 0, borderRadius: 8, background: "#2563eb", color: "white", font: "inherit", fontWeight: 700, cursor: "pointer" }}>ออกจากระบบ</button>}
      />
    );
  }

  if (accessStatus === "error") {
    return (
      <StatusPage
        title="ตรวจสอบสิทธิ์ไม่สำเร็จ"
        message="ระบบยังตั้งค่า allowlist/RLS ไม่ครบ หรือเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาติดต่อเจ้าของร้าน"
        action={(
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 8 }}>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", font: "inherit", fontWeight: 700, cursor: "pointer" }}>ลองอีกครั้ง</button>
            <button type="button" onClick={signOut} style={{ padding: "10px 14px", border: 0, borderRadius: 8, background: "#2563eb", color: "white", font: "inherit", fontWeight: 700, cursor: "pointer" }}>ออกจากระบบ</button>
          </div>
        )}
      />
    );
  }

  return children({ onSignOut: signOut, user: session.user, signOutError });
}
