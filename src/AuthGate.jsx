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

const PASSWORD_RESET_REDIRECT_URL = "https://my-shop-management.vercel.app";

function isPasswordRecoveryCallback() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("type") === "recovery" || hash.get("type") === "recovery";
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [requestingPasswordReset, setRequestingPasswordReset] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecoveryCallback);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [membership, setMembership] = useState({ userId: null, status: "idle" });
  const [retryCount, setRetryCount] = useState(0);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
      setLoginError("");
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data?.session ?? null);
      setAuthReady(true);
      if (isPasswordRecoveryCallback()) setPasswordRecovery(true);
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

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    if (!supabase) return;

    setResetError("");
    setResetMessage("");
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: PASSWORD_RESET_REDIRECT_URL,
      });
      if (error) throw error;
      setResetMessage("หากอีเมลนี้เป็นบัญชีร้าน ระบบจะส่งลิงก์ให้ กรุณาตรวจกล่องขาเข้าและโฟลเดอร์ Spam");
    } catch {
      setResetError("ส่งลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง หรือตรวจการตั้งค่า URL สำหรับ Auth ใน Supabase");
    } finally {
      setResetBusy(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    if (!session) {
      setResetError("ลิงก์นี้หมดอายุหรือใช้ไปแล้ว กรุณาขอลิงก์ใหม่");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setResetError("");
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordRecovery(false);
      setPasswordUpdated(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setResetError("เปลี่ยนรหัสผ่านไม่สำเร็จ ลิงก์อาจหมดอายุแล้ว กรุณาขอลิงก์ใหม่");
    } finally {
      setResetBusy(false);
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

  if (passwordUpdated) {
    return (
      <StatusPage
        title="เปลี่ยนรหัสผ่านแล้ว"
        message="รหัสผ่านใหม่พร้อมใช้งานแล้ว กดปุ่มด้านล่างเพื่อกลับเข้าร้าน"
        action={<button type="button" onClick={() => setPasswordUpdated(false)} style={{ marginTop: 18, padding: "10px 16px", border: 0, borderRadius: 8, background: "#2563eb", color: "white", font: "inherit", fontWeight: 700, cursor: "pointer" }}>เข้าใช้งานร้านต่อ</button>}
      />
    );
  }

  if (passwordRecovery) {
    if (!session) {
      return (
        <StatusPage
          title="ลิงก์รีเซ็ตรหัสผ่านใช้ไม่ได้"
          message="ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ"
          action={<button type="button" onClick={() => { setPasswordRecovery(false); setRequestingPasswordReset(true); }} style={{ marginTop: 18, padding: "10px 16px", border: 0, borderRadius: 8, background: "#2563eb", color: "white", font: "inherit", fontWeight: 700, cursor: "pointer" }}>ขอลิงก์ใหม่</button>}
        />
      );
    }

    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 38, marginBottom: 8 }} aria-hidden="true">🏍️</div>
            <h1 style={{ fontSize: 23, margin: "0 0 6px", color: "#111827" }}>ตั้งรหัสผ่านใหม่</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร</p>
          </div>
          <form onSubmit={updatePassword}>
            <div style={{ marginBottom: 15 }}>
              <label htmlFor="new-password" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>รหัสผ่านใหม่</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event => setNewPassword(event.target.value)} style={fieldStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="confirm-password" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>ยืนยันรหัสผ่านใหม่</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} style={fieldStyle} />
            </div>
            {resetError && <p role="alert" style={{ margin: "0 0 14px", color: "#b91c1c", fontSize: 14, lineHeight: 1.5 }}>{resetError}</p>}
            <button type="submit" disabled={resetBusy} style={{ width: "100%", padding: "12px 14px", border: 0, borderRadius: 9, background: resetBusy ? "#64748b" : "#2563eb", color: "white", font: "inherit", fontSize: 15, fontWeight: 700, cursor: resetBusy ? "wait" : "pointer" }}>
              {resetBusy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!session && requestingPasswordReset) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 38, marginBottom: 8 }} aria-hidden="true">🏍️</div>
            <h1 style={{ fontSize: 23, margin: "0 0 6px", color: "#111827" }}>ลืมรหัสผ่าน</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>กรอกอีเมลที่ใช้เข้าระบบ แล้วเราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
          </div>
          <form onSubmit={requestPasswordReset}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="reset-email" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>อีเมล</label>
              <input id="reset-email" type="email" autoComplete="email" required value={loginEmail} onChange={event => setLoginEmail(event.target.value)} style={fieldStyle} />
            </div>
            {resetError && <p role="alert" style={{ margin: "0 0 14px", color: "#b91c1c", fontSize: 14, lineHeight: 1.5 }}>{resetError}</p>}
            {resetMessage && <p role="status" style={{ margin: "0 0 14px", color: "#166534", fontSize: 14, lineHeight: 1.6 }}>{resetMessage}</p>}
            <button type="submit" disabled={resetBusy} style={{ width: "100%", padding: "12px 14px", border: 0, borderRadius: 9, background: resetBusy ? "#64748b" : "#2563eb", color: "white", font: "inherit", fontSize: 15, fontWeight: 700, cursor: resetBusy ? "wait" : "pointer" }}>
              {resetBusy ? "กำลังส่งลิงก์…" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
            </button>
          </form>
          <button type="button" onClick={() => { setRequestingPasswordReset(false); setResetError(""); setResetMessage(""); }} style={{ width: "100%", marginTop: 14, padding: 8, border: 0, background: "none", color: "#2563eb", font: "inherit", cursor: "pointer" }}>กลับไปหน้าเข้าสู่ระบบ</button>
        </section>
      </main>
    );
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

            <div style={{ textAlign: "right", margin: "-6px 0 14px" }}>
              <button
                type="button"
                onClick={() => { setRequestingPasswordReset(true); setLoginError(""); setResetError(""); setResetMessage(""); }}
                style={{ padding: 0, border: 0, background: "none", color: "#2563eb", font: "inherit", fontSize: 13, cursor: "pointer" }}
              >
                ลืมรหัสผ่าน?
              </button>
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
