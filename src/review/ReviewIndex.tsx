import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collectSourcedItems } from "../schema/stateBrochure";
import { docTitle, listFiles, loadFile, type Kind, type ReviewDoc } from "./api";

export default function ReviewIndex() {
  const [docs, setDocs] = useState<{ file: string; kind: Kind; doc: ReviewDoc }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all((["states", "national"] as const).map(async (kind) => (await listFiles(kind)).map((file) => ({ file, kind }))))
      .then((lists) => Promise.all(lists.flat().map(async ({ file, kind }) => ({ file, kind, doc: await loadFile(file, kind) }))))
      .then(setDocs)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/" className="text-sm text-brand-strong hover:underline">← Student site</Link>
      <h1 className="mt-2 text-3xl">Brochure review</h1>
      <p className="mt-1 text-soft">
        Local only. Check every extracted item against the brochure page, fix it, tick it, then publish. Only published
        states appear in the production build.
      </p>
      {error && <p className="mt-4 rounded-lg bg-bad-tint p-3 text-bad">{error}</p>}
      <ul className="mt-6 space-y-3">
        {docs?.map(({ file, kind, doc }) => {
          const items = collectSourcedItems(doc);
          const done = items.filter((i) => i.item.verified).length;
          return (
            <li key={file}>
              <Link to={kind === "states" ? `/review/${file}` : `/review/national/${file}`} className="block rounded-xl border border-line bg-surface p-5 hover:border-line-strong">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{docTitle(doc)}</h2>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${doc.status === "published" ? "bg-good-tint text-good" : "bg-warn-tint text-warn"}`}>
                    {doc.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-soft">{done}/{items.length} items verified</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
                  <div className="panel-accent h-full" style={{ width: `${(done / items.length) * 100}%` }} />
                </div>
              </Link>
            </li>
          );
        })}
        {docs?.length === 0 && <li className="text-soft">No files in data/states yet. Ask Claude Code to extract a brochure.</li>}
      </ul>
    </div>
  );
}
