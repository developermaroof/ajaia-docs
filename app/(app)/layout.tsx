import { Suspense, type ReactNode } from "react";
import { AppHeader, AppHeaderFallback } from "@/components/app-header";

// Everything except /login: header with the current user, then the page.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<AppHeaderFallback />}>
        <AppHeader />
      </Suspense>
      {children}
    </>
  );
}
