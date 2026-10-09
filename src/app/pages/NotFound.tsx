import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center sm:p-10">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-soft">That state or page isn't available.</p>
      <Link to="/" className="btn-secondary mt-4">Back to dashboard</Link>
    </div>
  );
}
