"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getFeed, type Job } from "@/lib/api";

/* ── SVG icon components ─────────────────────────────────────────────────── */
function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? "#f87171" : "none"}
      stroke={filled ? "#f87171" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconComment() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? "#7ba3ff" : "none"}
      stroke={filled ? "#7ba3ff" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/* ── Action button wrapper ───────────────────────────────────────────────── */
function ActionBtn({ onClick, icon, label, active }: {
  onClick: () => void; icon: React.ReactNode; label: string; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
        padding: "6px", borderRadius: "8px",
        transition: "transform 0.15s",
      }}
      onMouseDown={e => (e.currentTarget.style.transform = "scale(0.85)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
      <span style={{ fontSize: "11px", color: active ? undefined : "rgba(255,255,255,0.75)", fontWeight: 600 }}>
        {label}
      </span>
    </button>
  );
}

/* ── Comment drawer ──────────────────────────────────────────────────────── */
function CommentDrawer({ job, onClose }: { job: Job; onClose: () => void }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState<{ id: number; text: string; time: string }[]>([]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setComments(c => [...c, { id: Date.now(), text: text.trim(), time: "Just now" }]);
    setText("");
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10,
      }} />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "min(480px, 100vw)", maxHeight: "60vh",
        background: "var(--surface)", borderRadius: "20px 20px 0 0",
        padding: "16px 20px 24px", zIndex: 11,
        display: "flex", flexDirection: "column", gap: "12px",
        boxShadow: "0 -4px 40px rgba(0,0,0,0.4)",
      }}>
        {/* Handle */}
        <div style={{ width: "40px", height: "4px", borderRadius: "999px", background: "var(--border)", margin: "0 auto" }} />
        <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--fg)", textAlign: "center", margin: 0 }}>
          Comments
        </p>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", minHeight: "80px" }}>
          {comments.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--fg-muted)", textAlign: "center", paddingTop: "20px" }}>
              No comments yet. Be the first!
            </p>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "var(--accent)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 700, color: "#fff",
              }}>U</div>
              <div>
                <p style={{ fontSize: "13px", color: "var(--fg)", margin: 0 }}>{c.text}</p>
                <p style={{ fontSize: "11px", color: "var(--fg-muted)", margin: "2px 0 0" }}>{c.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={submit} style={{ display: "flex", gap: "8px" }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment…"
            style={{
              flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "999px", padding: "9px 14px", fontSize: "13px",
              color: "var(--fg)", outline: "none",
            }}
          />
          <button type="submit" style={{
            background: "var(--accent)", color: "#fff", border: "none",
            borderRadius: "999px", padding: "9px 18px", fontSize: "13px",
            fontWeight: 600, cursor: "pointer",
          }}>Post</button>
        </form>
      </div>
    </>
  );
}

/* ── Main feed page ──────────────────────────────────────────────────────── */
export default function FeedPage() {
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [current, setCurrent]     = useState(0);
  const [liked, setLiked]         = useState<Record<string, boolean>>({});
  const [saved, setSaved]         = useState<Record<string, boolean>>({});
  const [paused, setPaused]       = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [toast, setToast]         = useState("");
  const videoRefs                 = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    getFeed()
      .then(setJobs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Play current, pause others
  useEffect(() => {
    jobs.forEach((job, i) => {
      const el = videoRefs.current[job.job_id];
      if (!el) return;
      if (i === current) { el.play().catch(() => {}); setPaused(false); }
      else               { el.pause(); el.currentTime = 0; }
    });
  }, [current, jobs]);

  const togglePause = useCallback(() => {
    const el = videoRefs.current[jobs[current]?.job_id];
    if (!el) return;
    if (el.paused) { el.play(); setPaused(false); }
    else           { el.pause(); setPaused(true); }
  }, [current, jobs]);

  const goNext = useCallback(() => setCurrent(c => Math.min(c + 1, jobs.length - 1)), [jobs.length]);
  const goPrev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp")   goPrev();
      if (e.key === " ")         { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [goNext, goPrev, togglePause]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href);
    showToast("Link copied!");
  }

  if (loading) return (
    <div style={{ color: "var(--fg-muted)", fontSize: "14px", paddingTop: "80px", textAlign: "center" }}>Loading feed…</div>
  );
  if (error) return (
    <div style={{ color: "#f87171", background: "#7f1d1d22", border: "1px solid #7f1d1d55", borderRadius: "10px", padding: "12px 16px", fontSize: "13px" }}>{error}</div>
  );
  if (jobs.length === 0) return (
    <div style={{ textAlign: "center", paddingTop: "80px", color: "var(--fg-muted)" }}>
      <p style={{ fontSize: "16px", fontWeight: 500 }}>No videos yet.</p>
      <p style={{ fontSize: "13px", marginTop: "6px" }}>Upload filmmaking content to get started.</p>
    </div>
  );

  const job = jobs[current];
  const initials = (job.creator_name ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Reel card */}
        <div style={{
          position: "relative",
          width: "min(380px, 100%)",
          aspectRatio: "9 / 16",
          background: "#000",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
        }}>
          {/* Video */}
          {job.video_url ? (
            <video
              key={job.job_id}
              ref={el => { videoRefs.current[job.job_id] = el; }}
              src={job.video_url}
              playsInline
              onClick={togglePause}
              onEnded={goNext}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>No video available</p>
            </div>
          )}

          {/* Pause indicator */}
          {paused && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", gap: "5px" }}>
                  <div style={{ width: "4px", height: "18px", background: "#fff", borderRadius: "2px" }} />
                  <div style={{ width: "4px", height: "18px", background: "#fff", borderRadius: "2px" }} />
                </div>
              </div>
            </div>
          )}

          {/* Bottom gradient + creator info */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: "64px",
            padding: "60px 14px 16px",
            background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
            pointerEvents: "none",
          }}>
            {/* Creator row */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "15px", fontWeight: 700, color: "#fff",
                border: "2px solid rgba(255,255,255,0.6)",
                flexShrink: 0,
              }}>{initials}</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <p style={{ fontWeight: 700, fontSize: "14px", color: "#fff", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    {job.creator_name ?? "Unknown"}
                  </p>
                  <span style={{
                    fontSize: "10px", fontWeight: 600, padding: "1px 6px",
                    borderRadius: "999px", background: "var(--accent)",
                    color: "#fff", letterSpacing: "0.3px",
                  }}>CREATOR</span>
                </div>
                {job.creator_department && (
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", margin: "1px 0 0", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    {job.creator_department}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right-side action buttons */}
          <div style={{
            position: "absolute", right: "10px", bottom: "60px",
            display: "flex", flexDirection: "column", gap: "16px", alignItems: "center",
          }}>
            <ActionBtn
              onClick={() => setLiked(l => ({ ...l, [job.job_id]: !l[job.job_id] }))}
              icon={<IconHeart filled={!!liked[job.job_id]} />}
              label="Like"
              active={!!liked[job.job_id]}
            />
            <ActionBtn
              onClick={() => setCommenting(true)}
              icon={<IconComment />}
              label="Comment"
            />
            <ActionBtn
              onClick={handleShare}
              icon={<IconShare />}
              label="Share"
            />
            <ActionBtn
              onClick={() => setSaved(s => ({ ...s, [job.job_id]: !s[job.job_id] }))}
              icon={<IconBookmark filled={!!saved[job.job_id]} />}
              label="Save"
              active={!!saved[job.job_id]}
            />
          </div>

          {/* Toast */}
          {toast && (
            <div style={{
              position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: "12px", fontWeight: 600,
              padding: "6px 14px", borderRadius: "999px", whiteSpace: "nowrap",
              pointerEvents: "none",
            }}>{toast}</div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: "16px", marginTop: "16px", alignItems: "center" }}>
          <button onClick={goPrev} disabled={current === 0}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "50%", width: "40px", height: "40px", fontSize: "18px", cursor: current === 0 ? "not-allowed" : "pointer", opacity: current === 0 ? 0.3 : 1, color: "var(--fg)" }}>↑</button>
          <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>{current + 1} / {jobs.length}</span>
          <button onClick={goNext} disabled={current === jobs.length - 1}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "50%", width: "40px", height: "40px", fontSize: "18px", cursor: current === jobs.length - 1 ? "not-allowed" : "pointer", opacity: current === jobs.length - 1 ? 0.3 : 1, color: "var(--fg)" }}>↓</button>
        </div>
      </div>

      {/* Comment drawer */}
      {commenting && <CommentDrawer job={job} onClose={() => setCommenting(false)} />}
    </>
  );
}
