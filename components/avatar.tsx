export function Avatar({
  name,
  picture,
  size = 36,
}: {
  name: string;
  picture?: string;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const style = { width: size, height: size, fontSize: size * 0.4 };

  return picture ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, tiny
    <img
      src={picture}
      alt={name}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
      style={style}
    />
  ) : (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-semibold text-white ring-2 ring-white dark:ring-zinc-900"
      style={style}
      aria-label={name}
    >
      {initials || "?"}
    </span>
  );
}
