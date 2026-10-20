import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { listDocumentsForUser } from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Documents" };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Suspense fallback={<DashboardSkeleton />}>
        <MyDocuments />
      </Suspense>
    </main>
  );
}

async function MyDocuments() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned } = await listDocumentsForUser(user.id);
  return <Dashboard initialDocuments={owned} />;
}
