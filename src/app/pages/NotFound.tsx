import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-10 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-soft">That state or page isn't available.</p>
      <Link to="/" className="mt-4 inline-block font-semibold text-brand-strong hover:underline">Back to all states</Link>
    </div>
  );
}
