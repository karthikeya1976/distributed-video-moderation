"use client";

import { useEffect, useState } from "react";
import { getFeed, type Job } from "@/lib/api";

const BADGE: Record<string, React.CSSProperties> = {
  approved: { background: "#4169e122", color: "#7ba3ff", border: "1px solid #4169e144" },
  flagged:  { background: "#b4550022", color: "#fb923c", border: "1px solid #b4550044" },
  blocked:  { background: "#7f1d1d22", color: "#f87171", border: "1px solid #7f1d1d44" },
};

export default function FeedPage() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    getFeed()
      .then(setJobs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--fg)" }}>Feed</h1>
        <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginTop: "4px" }}>Approved &amp; reviewed filmmaking content</p>
      </div>

      {jobs.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: "80px", color: "var(--fg-muted)" }}>
          <p style={{ fontSize: "16px", fontWeight: 500 }}>No approved videos yet.</p>
          <p style={{ fontSize: "13px", marginTop: "6px" }}>Upload filmmaking content to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "380px", margin: "0 auto" }}>
          {jobs.map(job => (
            <div
              key={job.job_id}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "16px", overflow: "hidden",
              }}
            >
              {/* Video player — vertical reel format (9:16) */}
              {job.video_url && (
                <div style={{
                  position: "relative",
                  width: "100%",
                  paddingTop: "177.78%", /* 16:9 inverted = 9:16 */
                  background: "#000",
                  overflow: "hidden",
                }}>
                  {playing === job.job_id ? (
                    <video
                      src={job.video_url}
                      controls
                      autoPlay
                      style={{
                        position: "absolute", inset: 0,
                        width: "100%", height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => setPlaying(job.job_id)}
                      style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{
                        width: "64px", height: "64px", borderRadius: "50%",
                        background: "rgba(65,105,225,0.85)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{
                          width: 0, height: 0,
                          borderTop: "13px solid transparent",
                          borderBottom: "13px solid transparent",
                          borderLeft: "22px solid #fff",
                          marginLeft: "5px",
                        }} />
                      </div>
                      <p style={{ marginTop: "12px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                        Click to play
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata row */}
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {job.filename}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "2px" }}>
                    {new Date(job.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>

                {job.overall_status && (
                  <span style={{ fontSize: "12px", fontWeight: 500, padding: "4px 10px", borderRadius: "999px", whiteSpace: "nowrap", ...(BADGE[job.overall_status] ?? {}) }}>
                    {job.overall_status}
                  </span>
                )}

                {job.pillars && (
                  <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--fg-muted)" }}>
                    {job.pillars.map(p => (
                      <span key={p.pillar}>
                        {p.pillar.replace(/_/g, " ")}: <strong style={{ color: "var(--accent)" }}>{p.score}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
