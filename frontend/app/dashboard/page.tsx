import { JobsTable } from "@/components/jobs-table";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Moderation Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Jobs refresh every 3 seconds while processing. Click the chevron to
          see per-pillar scores and flag timestamps.
        </p>
      </div>
      <JobsTable />
    </div>
  );
}
