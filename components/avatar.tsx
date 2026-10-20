const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

// Same name → same colour, so people are recognisable at a glance.
const TONES = [
  "bg-[#dfe6fb] text-[#2b3a96]",
  "bg-[#dcf0e4] text-[#25643f]",
  "bg-[#fbe6d6] text-[#8a4310]",
  "bg-[#efe0f6] text-[#6a2f86]",
];

function tone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "size-6 text-[11px]" : "size-10 text-sm";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${dimensions} ${tone(name)}`}
    >
      {initials(name)}
    </span>
  );
}
