import type { Metadata } from "next";
import type {
  ReactNode,
} from "react";

import {
  notFound,
} from "next/navigation";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

import {
  requireAdmin,
} from "@/lib/admin-auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export default async function ProtectedAdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}) {
  const {
    locale,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  await requireAdmin(locale);

  return (
    <AdminShell locale={locale}>
      {children}
    </AdminShell>
  );
}
