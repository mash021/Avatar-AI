import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        AI-Powered Interactive Avatar
      </h1>
      <p className="max-w-2xl text-muted-foreground">
        Bilingual Arabic and English assistant grounded in your company
        knowledge base. Chat interface and admin dashboard coming in later
        phases.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/chat">Open Chat</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin">Admin Dashboard</Link>
        </Button>
      </div>
    </section>
  );
}
