import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-paper)]">
      <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-8 px-6">
        <Link href="/" className="mono text-[13px] font-bold tracking-tight">
          PROGPREP
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <NavLink href="/roadmaps/dotnet-backend">Roadmap</NavLink>
          <NavLink href="/progress">Progress</NavLink>
        </nav>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-2)] underline-offset-[6px] hover:text-[var(--color-ink)] hover:underline"
    >
      {children}
    </Link>
  );
}
