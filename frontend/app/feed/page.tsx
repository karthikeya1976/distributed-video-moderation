"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getFeed, type Job } from "@/lib/api";

export default function FeedPage() {
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [current, setCurrent]   = useState(0);
  const [liked, setLiked]       = useState<Record<string, boolean>>({});
  const [saved, setSaved]       = useState<Record<string, boolean>>({});
  const [paused, setPaused]     = useState(false);
  const videoRefs               = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    getFeed()
      .then(setJobs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Play current video, pause others
  useEffect(() => {
    jobs.forEach((job, i) => {
      const el = videoRefs.current[job.job_id];
      if (!el) return;
      if (i === current) {
        el.play().catch(() => {});
        setPaused(false);
      } else {
        el.pause();
        el.currentTime = 0;
      }
    });
  }, [current, jobs]);

  const togglePause = useCallback(() => {
    const job = jobs[current];
    if (!job) return;
    const el = videoRefs.current[job.job_id];
    if (!el) return;
    if (el.paused) { el.play(); setPaused(false); }
    else           { el.pause(); setPaused(true); }
  }, [current, jobs]);

  const goNext = useCallback(() => {
    setCurrent(c => Math.min(c + 1, jobs.length - 1));
  }, [jobs.length]);

  const goPrev = useCallback(() => {
    setCurrent(c => Math.max(c - 1, 0));
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown")  goNext();
      if (e.key === "ArrowUp")    goPrev();
      if (e.key === " ")          { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, togglePause]);

  if (loading) return (
    <div style={{ color: "var(--fg-muted)", fontSize: "14px", paddingTop: "80px", textAlign: "center" }}>
      Loading feed…
    </div>
  );

  if (error) return (
    <div style={{ color: "#f87171", background: "#7f1d1d22", border: "1px solid #7f1d1d55", borderRadius: "10px", padding: "12px 16px", fontSize: "13px" }}>
      {error}
    </div>
  );

  if (jobs.length === 0) return (
    <div style={{ textAlign: "center", paddingTop: "80px", color: "var(--fg-muted)" }}>
      <p style={{ fontSize: "16px", fontWeight: 500 }}>No videos yet.</p>
      <p style={{ fontSize: "13px", marginTop: "6px" }}>Upload filmmaking content to get started.</p>
    </div>
  );

  const job = jobs[current];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Reel container */}
      <div style={{
        position: "relative",
        width: "min(380px, 100%)",
        aspectRatio: "9 / 16",
        background: "#000",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}>
        {/* Video */}
        {job.video_url ? (
          <video
            key={job.job_id}
            ref={el => { videoRefs.current[job.job_id] = el; }}
            src={job.video_url}
            loop={false}
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
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: "4px", height: "20px", background: "#fff", borderRadius: "2px" }} />
                <div style={{ width: "4px", height: "20px", background: "#fff", borderRadius: "2px" }} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom info overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "48px 14px 16px",
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
          pointerEvents: "none",
        }}>
          <p style={{ fontWeight: 600, fontSize: "14px", color: "#fff", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            {job.filename.replace(/\.[^/.]+$/, "")}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: "2px 0 0", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            {new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Right-side action buttons */}
        <div style={{
          position: "absolute", right: "12px", bottom: "72px",
          display: "flex", flexDirection: "column", gap: "20px", alignItems: "center",
        }}>
          {/* Like */}
          <button
            onClick={() => setLiked(l => ({ ...l, [job.job_id]: !l[job.job_id] }))}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
          >
            <span style={{ fontSize: "28px", filter: liked[job.job_id] ? "none" : "grayscale(1)", transition: "filter 0.15s" }}>
              {liked[job.job_id] ? "❤️" : "🤍"}
            </span>
            <span style={{ fontSize: "11px", color: liked[job.job_id] ? "#f87171" : "rgba(255,255,255,0.7)", fontWeight: 600 }}>Like</span>
          </button>

          {/* Comment */}
          <button
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
          >
            <span style={{ fontSize: "28px" }}>💬</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Comment</span>
          </button>

          {/* Share */}
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
          >
            <span style={{ fontSize: "28px" }}>↗️</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Share</span>
          </button>

          {/* Save */}
          <button
            onClick={() => setSaved(s => ({ ...s, [job.job_id]: !s[job.job_id] }))}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
          >
            <span style={{ fontSize: "28px" }}>{saved[job.job_id] ? "🔖" : "📌"}</span>
            <span style={{ fontSize: "11px", color: saved[job.job_id] ? "#7ba3ff" : "rgba(255,255,255,0.7)", fontWeight: 600 }}>Save</span>
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
        <button
          onClick={goPrev}
          disabled={current === 0}
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "50%", width: "40px", height: "40px",
            fontSize: "18px", cursor: current === 0 ? "not-allowed" : "pointer",
            opacity: current === 0 ? 0.3 : 1, color: "var(--fg)",
          }}
        >↑</button>

        <span style={{ fontSize: "13px", color: "var(--fg-muted)", alignSelf: "center" }}>
          {current + 1} / {jobs.length}
        </span>

        <button
          onClick={goNext}
          disabled={current === jobs.length - 1}
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "50%", width: "40px", height: "40px",
            fontSize: "18px", cursor: current === jobs.length - 1 ? "not-allowed" : "pointer",
            opacity: current === jobs.length - 1 ? 0.3 : 1, color: "var(--fg)",
          }}
        >↓</button>
      </div>
    </div>
  );
}
