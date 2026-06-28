const API = "http://localhost:8088";

export type PillarFlag = {
  timestamp: string;
  label: string;
  reference_id?: string;
};

export type PillarResult = {
  pillar: "adult_content" | "ai_deepfake" | "copyright_match";
  score: number;
  flags: PillarFlag[];
};

export type Job = {
  job_id: string;
  filename: string;
  status: "pending" | "processing" | "done";
  overall_status?: "approved" | "flagged" | "blocked";
  pillars?: PillarResult[];
  reasons?: string[];
  size_bytes?: number;
  created_at: string;
  updated_at: string;
};

export async function uploadVideo(
  file: File
): Promise<{ task_id: string; status: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/videos`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/videos`);
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json();
}

export async function getJobStatus(job_id: string): Promise<Job> {
  const res = await fetch(`${API}/videos/${job_id}/status`);
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
  return res.json();
}
