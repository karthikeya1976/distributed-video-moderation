import { Progress } from "@/components/ui/progress";
import type { Job, PillarResult } from "@/lib/api";
import { Clock } from "lucide-react";

const PILLAR_LABELS: Record<string, string> = {
  adult_content: "Adult Content",
  ai_deepfake: "AI / Deepfake",
  copyright_match: "Copyright Match",
};

const PILLAR_THRESHOLDS: Record<string, { flag?: number; block?: number }> = {
  adult_content: { flag: 0.5, block: 0.8 },
  ai_deepfake: { flag: 0.7 },
  copyright_match: { block: 0.6 },
};

function pillarColor(pillar: string, score: number): string {
  const t = PILLAR_THRESHOLDS[pillar] ?? {};
  if (t.block !== undefined && score >= t.block) return "bg-red-500";
  if (t.flag !== undefined && score >= t.flag) return "bg-amber-400";
  return "bg-green-500";
}

function PillarRow({ result }: { result: PillarResult }) {
  const pct = Math.round(result.score * 100);
  const color = pillarColor(result.pillar, result.score);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-slate-700">
        <span>{PILLAR_LABELS[result.pillar] ?? result.pillar}</span>
        <span>{pct}%</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {result.flags.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {result.flags.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="font-mono">[{f.timestamp}]</span>
              <span>{f.label.replace(/_/g, " ")}</span>
              {f.reference_id && (
                <span className="text-slate-400">— ref: {f.reference_id}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function JobDetail({ job }: { job: Job }) {
  if (!job.pillars || job.pillars.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">
        Processing — results will appear here shortly.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Per-pillar scores */}
      <div className="space-y-3">
        {job.pillars.map((p) => (
          <PillarRow key={p.pillar} result={p} />
        ))}
      </div>

      {/* Reasons */}
      {job.reasons && job.reasons.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Policy Triggers
          </p>
          <ul className="space-y-0.5">
            {job.reasons.map((r, i) => (
              <li key={i} className="text-xs text-slate-600">
                • {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
