import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { Avatar } from "./avatar";
import { SwitchUserButton } from "./switch-user-button";

function Shell({ right }: { right?: React.ReactNode }) {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-between gap-4 px-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Ajaia Docs
        </Link>
        {right}
      </div>
    </header>
  );
}

// Reads the session cookie, so it must render inside <Suspense>.
export async function AppHeader() {
  const user = await getCurrentUser();
  return (
    <Shell
      right={
        user && (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
              <Avatar name={user.name} size="sm" />
              <span className="truncate" title={user.email}>
                {user.name}
              </span>
            </span>
            <SwitchUserButton />
          </div>
        )
      }
    />
  );
}

export function AppHeaderFallback() {
  return <Shell />;
}
