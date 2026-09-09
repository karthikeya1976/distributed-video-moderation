import { getToken } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8088";

// ── Types ──────────────────────────────────────────────────────────────────

export type PillarFlag = {
  timestamp?: string;
  label: string;
  detail?: string;
  reference_id?: string;
};

export type PillarResult = {
  pillar: string;
  score: number;
  flags: PillarFlag[];
};

export type Job = {
  job_id: string;
  filename: string;
  file_path?: string;
  status: "pending" | "processing" | "done";
  overall_status?: "approved" | "flagged" | "blocked";
  pillars?: PillarResult[];
  reasons?: string[];
  size_bytes?: number;
  user_id?: string;
  video_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  account_type: "viewer" | "creator";
  department?: string;
  created_at?: string;
};

// ── Auth ───────────────────────────────────────────────────────────────────

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ message: string; user: User }> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Registration failed");
  }
  return res.json();
}

export async function login(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Login failed");
  }
  return res.json();
}

export async function upgradeToCreator(
  department: string
): Promise<{ message: string; user: User }> {
  const token = getToken();
  const res = await fetch(`${API}/auth/upgrade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ department }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Upgrade failed");
  }
  return res.json();
}

// ── Videos ─────────────────────────────────────────────────────────────────

export async function uploadVideo(
  file: File
): Promise<{ task_id: string; status: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/videos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function getJobStatus(job_id: string): Promise<Job> {
  const res = await fetch(`${API}/videos/${job_id}/status`);
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
  return res.json();
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/videos`);
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json();
}

export async function getFeed(): Promise<Job[]> {
  const res = await fetch(`${API}/feed`);
  if (!res.ok) throw new Error(`Feed failed: ${res.status}`);
  return res.json();
}
