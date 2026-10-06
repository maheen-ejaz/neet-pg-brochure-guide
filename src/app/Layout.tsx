import { Link, NavLink, Outlet, ScrollRestoration } from "react-router-dom";
import { comparisonEnabled } from "../data/states";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-white/20 text-white" : "text-white/80 hover:text-white"}`;

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 bg-brand-strong">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-heading)" }}>GooCampus</span>
            <span className="hidden border-l border-white/30 pl-2.5 text-sm font-semibold text-white sm:inline">
              NEET PG Counselling Guide
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>States</NavLink>
            <NavLink to="/profile" className={navClass}>My profile</NavLink>
            {comparisonEnabled && <NavLink to="/compare" className={navClass}>Compare</NavLink>}
            {import.meta.env.DEV && <NavLink to="/review" className={navClass}>Review</NavLink>}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-surface">
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
