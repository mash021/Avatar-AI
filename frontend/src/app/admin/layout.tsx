"use client";

import { usePathname } from "next/navigation";

import { AuthGuard } from "@/components/admin/AuthGuard";
import { Sidebar } from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  return (
    <AuthGuard>
      {isLoginPage ? (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          {children}
        </div>
      ) : (
        <div className="-mx-4 -my-8 flex min-h-screen">
          <Sidebar />
          <div className="flex-1 p-6">{children}</div>
        </div>
      )}
    </AuthGuard>
  );
}
