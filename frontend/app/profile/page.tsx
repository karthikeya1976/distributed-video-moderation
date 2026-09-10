"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { upgradeToCreator } from "@/lib/api";
import { getUser, setAuth, getToken, clearAuth, type AuthUser } from "@/lib/auth";

const DEPARTMENTS = [
  "Cinematography", "Directing", "Screenwriting", "Editing",
  "Sound Design", "Visual Effects", "Production Design", "Acting", "Other",
];

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: "8px", padding: "10px 12px", fontSize: "14px",
  color: "var(--fg)", outline: "none",
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/"); return; }
    setUser(u);
  }, [router]);

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setUpgrading(true);
    try {
      const { user: updated } = await upgradeToCreator(department);
      const token = getToken()!;
      setAuth(token, {
        id: updated.id, name: updated.name ?? user?.name ?? "",
        email: updated.email ?? user?.email ?? "",
        account_type: updated.account_type, department: updated.department,
      });
      setUser(getUser());
      setSuccess("Upgraded to Creator! You can now upload showreels.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setUpgrading(false);
    }
  }

  if (!user) return null;

  const isCreator = user.account_type === "creator";

  return (
    <div style={{ maxWidth: "440px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--fg)", marginBottom: "24px" }}>Profile</h1>

      {/* User card */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: "var(--accent)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", fontWeight: 700,
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--fg)" }}>{user.name}</p>
            <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>{user.email}</p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Account type</span>
          <span style={{
            fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px",
            background: isCreator ? "var(--accent-bg)" : "var(--bg)",
            color: isCreator ? "var(--accent)" : "var(--fg-muted)",
            border: `1px solid ${isCreator ? "var(--accent)" : "var(--border)"}`,
          }}>
            {isCreator ? "Creator" : "Viewer"}
          </span>
        </div>

        {user.department && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>Department</span>
            <span style={{ fontSize: "13px", color: "var(--fg)" }}>{user.department}</span>
          </div>
        )}
      </div>

      {/* Upgrade section */}
      {!isCreator && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)", marginBottom: "6px" }}>Become a Creator</h2>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginBottom: "18px" }}>
            Upload showreels and share your filmmaking work with the community.
          </p>

          <form onSubmit={handleUpgrade} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--fg-muted)", marginBottom: "6px" }}>
                Your filmmaking department
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {DEPARTMENTS.map(d => <option key={d} style={{ background: "var(--bg)" }}>{d}</option>)}
              </select>
            </div>

            {error   && <p style={{ fontSize: "13px", color: "#f87171", background: "#7f1d1d22", border: "1px solid #7f1d1d55", borderRadius: "8px", padding: "10px 12px" }}>{error}</p>}
            {success && <p style={{ fontSize: "13px", color: "#7ba3ff", background: "#4169e122", border: "1px solid #4169e144", borderRadius: "8px", padding: "10px 12px" }}>{success}</p>}

            <button
              type="submit" disabled={upgrading}
              style={{
                width: "100%", padding: "10px", fontSize: "14px", fontWeight: 600,
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: "8px", cursor: upgrading ? "not-allowed" : "pointer",
                opacity: upgrading ? 0.6 : 1,
              }}
            >
              {upgrading ? "Upgrading…" : "Upgrade to Creator"}
            </button>
          </form>
        </div>
      )}

      {/* Settings */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--fg)", marginBottom: "4px" }}>Settings</h2>
        <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginBottom: "16px" }}>Account preferences and controls</p>
        {[
          { label: "Notifications", desc: "Email alerts for new followers and credits" },
          { label: "Privacy", desc: "Control who can see your profile and videos" },
          { label: "Account", desc: "Change password or delete your account" },
        ].map((s, i, arr) => (
          <div key={s.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 0",
            borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--fg)", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: "12px", color: "var(--fg-muted)", margin: "2px 0 0" }}>{s.desc}</p>
            </div>
            <span style={{
              fontSize: "11px", color: "var(--fg-muted)", background: "var(--bg)",
              border: "1px solid var(--border)", borderRadius: "999px", padding: "2px 10px",
              flexShrink: 0, marginLeft: "12px",
            }}>Soon</span>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={() => { clearAuth(); router.push("/"); }}
        style={{
          width: "100%", padding: "10px", fontSize: "14px", fontWeight: 500,
          background: "transparent", color: "var(--fg-muted)",
          border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer",
        }}
      >
        Log out
      </button>
    </div>
  );
}
