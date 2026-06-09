import { DocumentUpload } from "@/components/admin/DocumentUpload";

export default function AdminDocumentsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <DocumentUpload />
    </section>
  );
}
