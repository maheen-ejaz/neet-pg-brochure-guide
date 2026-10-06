import { Link, NavLink, Outlet, ScrollRestoration } from "react-router-dom";
import { comparisonEnabled } from "../data/states";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-2.5 py-1.5 text-sm transition-colors ${isActive ? "bg-brand-tint text-brand-strong" : "text-soft hover:text-ink"}`;

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2">
            <span aria-hidden className="panel-accent grid h-6 w-6 place-items-center rounded-md text-xs font-semibold">G</span>
            <span className="font-heading text-base font-semibold tracking-tight text-ink">GooCampus</span>
            <span className="hidden text-sm text-soft sm:inline">NEET PG Guide</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>States</NavLink>
            <NavLink to="/profile" className={navClass}>My profile</NavLink>
            {comparisonEnabled && <NavLink to="/compare" className={navClass}>Compare</NavLink>}
            {import.meta.env.DEV && <NavLink to="/review" className={navClass}>Review</NavLink>}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-soft">
          <p>
            This guide summarises official state counselling brochures to help you understand them. It is not
            the official source. Rules, dates and fees can change through later notices, so always confirm on the
            state's official counselling website before acting. Your profile is stored only in this browser.
          </p>
          <p className="mt-2">© GooCampus</p>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
