import Link from "next/link";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/chat", label: "Chat" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-foreground">
          AI Avatar
        </Link>
        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
