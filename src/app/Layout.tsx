import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
} from "react-router-dom";
import { schedules } from "../data/schedules";
import { states, comparisonEnabled } from "../data/states";
import { Icon } from "./components/Icon";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `workspace-nav ${isActive ? "workspace-nav-active" : ""}`;

export function Layout() {
  const { pathname } = useLocation();
  const context =
    pathname === "/"
      ? "Dashboard"
      : pathname === "/profile"
        ? "My profile"
        : pathname === "/compare"
          ? "Compare states"
          : pathname.startsWith("/mcc/")
            ? "MCC dates"
            : "State guide";
  const navigation = (
    <>
      <NavLink to="/" end className={navClass}>
        <Icon name="dashboard" />
        Dashboard
      </NavLink>
      <NavLink to="/profile" className={navClass}>
        <Icon name="profile" />
        My profile
      </NavLink>
      {schedules[0] && (
        <NavLink to={`/mcc/${schedules[0].key}`} className={navClass}>
          <Icon name="calendar" />
          MCC dates
        </NavLink>
      )}
      <NavLink to="/compare" className={navClass}>
        <Icon name="compare" />
        Compare
        <span className="hidden text-xs text-body lg:inline">
          {comparisonEnabled ? "" : "Soon"}
        </span>
      </NavLink>
    </>
  );

  return (
    <div className="workspace">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="workspace-sidebar no-print">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2 text-ink">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-base font-semibold text-surface"
          >
            G
          </span>
          <span>
            <span className="block font-heading text-lg font-semibold tracking-tight">
              GooCampus
            </span>
            <span className="block text-xs text-soft">NEET PG Guide</span>
          </span>
        </Link>
        <p className="eyebrow mt-9 mb-3 px-3">Your workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {navigation}
        </nav>
        {states.length > 0 && (
          <>
            <p className="eyebrow mt-8 mb-3 px-3">State guides</p>
            <nav aria-label="State guides" className="space-y-1">
              {states.map(({ key, brochure }) => (
                <NavLink key={key} to={`/state/${key}`} className={navClass}>
                  <Icon name="book" className="h-4 w-4" />
                  <span>{brochure.meta.state}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}
        <div className="mt-auto pt-8">
          <div className="rounded-xl border border-line bg-canvas p-3.5 text-xs text-soft">
            <Icon name="shield" className="mb-2 h-5 w-5 text-body" />
            <p className="font-semibold text-ink">
              Your profile stays with you
            </p>
            <p className="mt-1">
              Saved only in this browser. No account needed.
            </p>
          </div>
          {import.meta.env.DEV && (
            <Link to="/review" className="workspace-nav mt-3 text-xs">
              Local review tool ↗
            </Link>
          )}
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header no-print">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
            <Link
              to="/"
              className="font-heading font-semibold text-ink lg:hidden"
            >
              GooCampus{" "}
              <span className="text-xs font-medium text-soft">/ NEET PG</span>
            </Link>
            <p className="hidden text-sm text-soft lg:block">
              Workspace{" "}
              <span aria-hidden className="mx-2 text-soft">
                /
              </span>{" "}
              <span className="font-medium text-ink">{context}</span>
            </p>
            <span className="hidden rounded-md border border-line bg-canvas px-2.5 py-1 text-xs text-soft sm:inline-flex">
              Brochure-based guidance
            </span>
          </div>
          <nav
            aria-label="Mobile navigation"
            className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 lg:hidden"
          >
            {navigation}
          </nav>
        </header>
        <main id="main-content" tabIndex={-1} className="workspace-main">
          <Outlet />
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-soft sm:px-8">
          <div className="border-t border-line pt-5">
            <p>
              This guide explains official counselling documents. Confirm rules,
              dates and fees on the official counselling website before acting.
            </p>
            <p className="mt-2">
              © GooCampus · Your profile is stored only in this browser.
            </p>
          </div>
        </footer>
      </div>
      <ScrollRestoration />
    </div>
  );
}
