"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardStats } from "@/lib/api";
import type { DashboardStats } from "@/types/admin";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats).catch(() => setStats(null));
  }, []);

  const cards = stats
    ? [
        { label: "Website URLs", value: stats.total_urls },
        { label: "Documents", value: stats.total_documents },
        { label: "Active Jobs", value: stats.active_jobs },
        { label: "Completed Jobs", value: stats.completed_jobs },
        { label: "Failed Jobs", value: stats.failed_jobs },
      ]
    : [];

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {!stats ? (
        <p className="text-muted-foreground">Loading stats...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
