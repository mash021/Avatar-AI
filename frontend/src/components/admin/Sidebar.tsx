"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearTokens } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/urls", label: "Website URLs" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/knowledge", label: "Knowledge" },
  { href: "/admin/chat-logs", label: "Chat Logs" },
  { href: "/admin/avatar", label: "Avatar" },
];

export function Sidebar() {
  const pathname = usePathname();

  function handleLogout() {
    clearTokens();
    window.location.href = "/admin/login";
  }

  return (
    <aside className="flex w-56 flex-col border-r bg-card p-4">
      <div className="mb-8 text-lg font-semibold">Admin Panel</div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
              pathname === link.href && "bg-accent font-medium",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Button variant="outline" onClick={handleLogout}>
        Logout
      </Button>
    </aside>
  );
}
