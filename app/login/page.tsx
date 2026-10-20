import type { Metadata } from "next";
import { Suspense } from "react";
import { listUsers } from "@/lib/users";
import { UserPicker } from "./user-picker";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Ajaia Docs</h1>
      <p className="mt-2 text-ink-muted">
        Choose a demo user to continue. Login is mocked on purpose, so there are no passwords.
      </p>
      <div className="mt-8">
        <Suspense fallback={<PickerSkeleton />}>
          <Users searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Users({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const [users, { next }] = await Promise.all([listUsers(), searchParams]);
  return <UserPicker users={users} next={typeof next === "string" ? next : undefined} />;
}

function PickerSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading users">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-[68px] rounded-xl border border-rule bg-paper motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
