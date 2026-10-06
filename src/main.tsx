import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import "./index.css";
import { Layout } from "./app/Layout";
import { HomePage } from "./app/pages/HomePage";
import { ProfilePage } from "./app/pages/ProfilePage";
import { StatePage } from "./app/pages/StatePage";
import { ComparePage } from "./app/pages/ComparePage";
import { NotFound } from "./app/pages/NotFound";

const children: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: "profile", element: <ProfilePage /> },
  { path: "state/:key", element: <StatePage /> },
  { path: "compare", element: <ComparePage /> },
];

const reviewRoutes: RouteObject[] = [];

// The review tool is local-only: this branch is removed from production builds.
if (import.meta.env.DEV) {
  const ReviewIndex = lazy(() => import("./review/ReviewIndex"));
  const ReviewEditor = lazy(() => import("./review/ReviewEditor"));
  reviewRoutes.push(
    { path: "/review", element: <Suspense><ReviewIndex /></Suspense> },
    { path: "/review/:file", element: <Suspense><ReviewEditor /></Suspense> },
  );
}
children.push({ path: "*", element: <NotFound /> });

const router = createBrowserRouter([...reviewRoutes, { path: "/", element: <Layout />, children }]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
