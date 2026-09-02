"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadVideo, getJobStatus, type Job } from "@/lib/api";
import { isLoggedIn, isCreator } from "@/lib/auth";

const RESULT_STYLE: Record<string, React.CSSProperties> = {
  approved: { border: "1px solid #4169e144", background: "#4169e10d" },
  flagged:  { border: "1px solid #b4550044", background: "#b455000d" },
  blocked:  { border: "1px solid #7f1d1d55", background: "#7f1d1d0d" },
};

const RESULT_COLOR: Record<string, string> = {
  approved: "#7ba3ff",
  flagged:  "#fb923c",
  blocked:  "#f87171",
};

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");
  const [job, setJob]           = useState<Job | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/"); return; }
    if (!isCreator())  { router.replace("/profile"); }
  }, [router]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function handleUpload() {
    if (!file) return;
    setError(""); setUploading(true); setJob(null);
    try {
      const { task_id } = await uploadVideo(file);
      pollRef.current = setInterval(async () => {
        const s = await getJobStatus(task_id);
        if (s.status === "done") {
          clearInterval(pollRef.current!);
          setJob(s);
          setUploading(false);
        }
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  const status = job?.overall_status ?? "";

  return (
    <div style={{ maxWidth: "520px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--fg)" }}>Upload</h1>
        <p style={{ fontSize: "13px", color: "var(--fg-muted)", marginTop: "4px" }}>
          Submit your showreel for AI moderation
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${file ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "14px", padding: "48px 24px",
          textAlign: "center", cursor: "pointer",
          background: "var(--surface)", transition: "border-color 0.15s",
        }}
      >
        <input ref={inputRef} type="file" accept="video/*" style={{ display: "none" }}
               onChange={e => setFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <>
            <p style={{ fontWeight: 600, color: "var(--fg)" }}>{file.name}</p>
            <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "4px" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 500, color: "var(--fg-muted)" }}>Drop a video here</p>
            <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "4px", opacity: 0.6 }}>or click to browse</p>
          </>
        )}
      </div>

      {error && (
        <p style={{ marginTop: "12px", fontSize: "13px", color: "#f87171", background: "#7f1d1d22", border: "1px solid #7f1d1d55", borderRadius: "8px", padding: "10px 12px" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          marginTop: "16px", width: "100%", padding: "11px",
          fontSize: "14px", fontWeight: 600, borderRadius: "9px", border: "none",
          background: "var(--accent)", color: "#fff",
          cursor: (!file || uploading) ? "not-allowed" : "pointer",
          opacity: (!file || uploading) ? 0.45 : 1, transition: "opacity 0.15s",
        }}
      >
        {uploading ? "Processing…" : "Submit for moderation"}
      </button>

      {/* Result */}
      {job && (
        <div style={{ marginTop: "24px", borderRadius: "14px", padding: "20px", ...(RESULT_STYLE[status] ?? { border: "1px solid var(--border)", background: "var(--surface)" }) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontWeight: 600, color: "var(--fg)" }}>{job.filename}</p>
            <span style={{ fontSize: "13px", fontWeight: 600, color: RESULT_COLOR[status] ?? "var(--fg)", textTransform: "capitalize" }}>
              {status}
            </span>
          </div>

          {job.reasons && job.reasons.length > 0 && (
            <ul style={{ fontSize: "12px", color: "var(--fg-muted)", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {job.reasons.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          )}

          {job.pillars && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {job.pillars.map(p => (
                <div key={p.pillar}>
                  <p style={{ fontSize: "11px", color: "var(--fg-muted)", marginBottom: "4px" }}>
                    {p.pillar.replace(/_/g, " ")}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ flex: 1, height: "4px", borderRadius: "999px", background: "var(--border)" }}>
                      <div style={{ height: "4px", borderRadius: "999px", background: "var(--accent)", width: `${Math.round(p.score * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--accent)" }}>{p.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
