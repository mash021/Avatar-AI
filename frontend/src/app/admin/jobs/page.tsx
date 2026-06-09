import { JobStatusList } from "@/components/admin/JobStatusList";

export default function AdminJobsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Ingestion Jobs</h1>
      <JobStatusList />
    </section>
  );
}
