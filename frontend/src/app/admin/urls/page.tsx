import { UrlManager } from "@/components/admin/UrlManager";

export default function AdminUrlsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Website URLs</h1>
      <UrlManager />
    </section>
  );
}
