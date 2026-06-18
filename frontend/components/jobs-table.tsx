"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobDetail } from "@/components/job-detail";
import { listJobs, type Job } from "@/lib/api";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function statusBadge(job: Job) {
  if (job.status !== "done") {
    return (
      <Badge variant={job.status === "processing" ? "processing" : "pending"}>
        {job.status}
      </Badge>
    );
  }
  return (
    <Badge variant={job.overall_status ?? "default"}>
      {job.overall_status}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchJobs() {
    try {
      const data = await listJobs();
      setJobs(data);
      setError(null);
      // Stop polling once all jobs are done
      const anyPending = data.some((j) => j.status !== "done");
      if (!anyPending && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
    intervalRef.current = setInterval(fetchJobs, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading jobs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded bg-red-50 text-red-700 px-4 py-3 text-sm">
        {error} — is the backend running on port 8088?
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        No videos uploaded yet.{" "}
        <a href="/" className="text-slate-700 underline">
          Upload one
        </a>{" "}
        to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Filename</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Verdict</th>
            <th className="px-4 py-3 text-left">Submitted</th>
            <th className="px-4 py-3 text-left">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <>
              <tr key={job.job_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-700 max-w-[180px] truncate">
                  {job.filename}
                </td>
                <td className="px-4 py-3">{statusBadge(job)}</td>
                <td className="px-4 py-3">
                  {job.overall_status ? (
                    <Badge variant={job.overall_status}>{job.overall_status}</Badge>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {formatDate(job.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedId(expandedId === job.job_id ? null : job.job_id)
                    }
                  >
                    {expandedId === job.job_id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </td>
              </tr>
              {expandedId === job.job_id && (
                <tr key={`${job.job_id}-detail`} className="bg-slate-50">
                  <td colSpan={5} className="px-6 py-4">
                    <JobDetail job={job} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
