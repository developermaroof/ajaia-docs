import type { ShareRole } from "@/lib/types";

export function RoleBadge({ role }: { role: ShareRole }) {
  const tone = role === "editor" ? "bg-accent-soft text-accent" : "bg-desk text-ink-muted";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {role}
    </span>
  );
}
