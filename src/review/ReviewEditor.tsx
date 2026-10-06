import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collectSourcedItems, type Brochure, type SourcedItem } from "../schema/stateBrochure";
import { loadFile, pageUrl, saveFile } from "./api";

type Item = SourcedItem & Record<string, unknown>;

const SYSTEM_KEYS = new Set(["id", "verified", "sourcePages", "note"]);

function getAt(root: unknown, path: string[]): unknown {
  return path.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], root);
}

/** Returns a deep copy of doc with fn applied to the item at path. */
function updateAt(doc: Brochure, path: string[], fn: (item: Item) => void): Brochure {
  const copy = structuredClone(doc);
  fn((path.length ? getAt(copy, path) : copy) as Item);
  return copy;
}

const sectionOf = (path: string[]) => path[0];
const SECTION_LABELS: Record<string, string> = {
  meta: "Overview",
  process: "Process steps",
  eligibility: "Eligibility",
  reservation: "Reservation",
  fees: "Fees & deposits",
  choiceFilling: "Choice filling",
  rounds: "Rounds",
  documents: "Documents",
  admission: "Admission",
  resignation: "Resignation",
  serviceBond: "Service bond",
  helpdesk: "Help desk",
  nodalCentres: "Nodal centres",
  disabilityCentres: "Disability centres",
  annexures: "Annexures",
  importantDates: "Dates",
  gaps: "Gaps",
};

function itemTitle(item: Item) {
  for (const k of ["title", "name", "label", "stage", "centre", "state"]) {
    if (typeof item[k] === "string") return item[k] as string;
  }
  if (typeof item.amountInr === "number") return `${item.id} (₹${item.amountInr.toLocaleString("en-IN")})`;
  return item.id;
}

export default function ReviewEditor() {
  const { file = "" } = useParams();
  const [doc, setDoc] = useState<Brochure | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [section, setSection] = useState<string>("meta");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);

  useEffect(() => {
    loadFile(file).then(setDoc).catch((e) => setStatus({ kind: "error", text: String(e) }));
  }, [file]);

  const items = useMemo(() => (doc ? collectSourcedItems(doc) : []), [doc]);
  const sections = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    for (const { path, item } of items) {
      const s = m.get(sectionOf(path)) ?? { total: 0, done: 0 };
      s.total++;
      if (item.verified) s.done++;
      m.set(sectionOf(path), s);
    }
    return [...m.entries()];
  }, [items]);
  const visible = items.filter((i) => sectionOf(i.path) === section && (!showUnverifiedOnly || !i.item.verified));
  const selected = items.find((i) => i.item.id === selectedId) ?? visible[0] ?? null;
  const verifiedCount = items.filter((i) => i.item.verified).length;
  const allVerified = items.length > 0 && verifiedCount === items.length;

  // Jump the page viewer to the selected item's first cited page.
  useEffect(() => {
    if (selected?.item.sourcePages[0]) setPage(selected.item.sourcePages[0]);
  }, [selected?.item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = useCallback((path: string[], fn: (item: Item) => void) => {
    setDoc((d) => (d ? updateAt(d, path, fn) : d));
    setDirty(true);
    setStatus(null);
  }, []);

  const save = async (next?: Brochure) => {
    const target = next ?? doc;
    if (!target) return;
    const res = await saveFile(file, target);
    if (res.ok) {
      setDirty(false);
      if (next) setDoc(next);
      setStatus({ kind: "ok", text: "Saved to data/states/" + file + ".json" });
    } else setStatus({ kind: "error", text: res.error });
  };

  const verifyAndNext = () => {
    if (!selected) return;
    mutate(selected.path, (it) => { it.verified = true; });
    const idx = visible.findIndex((v) => v.item.id === selected.item.id);
    const next = visible.slice(idx + 1).find((v) => !v.item.verified) ?? visible[idx + 1];
    if (next) setSelectedId(next.item.id);
  };

  const verifySection = () => {
    if (!doc) return;
    let next = doc;
    for (const v of items.filter((i) => sectionOf(i.path) === section)) {
      next = updateAt(next, v.path, (it) => { it.verified = true; });
    }
    setDoc(next);
    setDirty(true);
  };

  const setPublished = (published: boolean) => {
    if (!doc) return;
    void save({ ...doc, status: published ? "published" : "draft" });
  };

  // Keyboard: ←/→ pages, Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); void save(); }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!doc) return;
      if (e.key === "ArrowRight") setPage((p) => Math.min(doc.source.pageCount, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!doc) return <div className="p-8">{status?.text ?? "Loading…"}</div>;

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2">
        <Link to="/review" className="text-sm text-brand-strong hover:underline">← Review</Link>
        <h1 className="text-lg font-semibold">{doc.meta.state} {doc.meta.year}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${doc.status === "published" ? "bg-good-tint text-good" : "bg-warn-tint text-warn"}`}>{doc.status}</span>
        <span className="text-sm text-soft">{verifiedCount}/{items.length} verified</span>
        <div className="ml-auto flex items-center gap-2">
          {status && (
            <span className={`max-w-md truncate text-xs ${status.kind === "ok" ? "text-good" : "text-bad"}`} title={status.text}>{status.text}</span>
          )}
          <Link to={`/state/${file}`} target="_blank" className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-brand">Preview ↗</Link>
          <button type="button" onClick={() => void save()} disabled={!dirty}
            className="rounded-full border border-brand px-3 py-1.5 text-sm font-semibold text-brand-strong disabled:opacity-40">
            {dirty ? "Save (⌘S)" : "Saved"}
          </button>
          {doc.status === "published" ? (
            <button type="button" onClick={() => setPublished(false)} className="rounded-full bg-warn px-3 py-1.5 text-sm font-semibold text-white">Unpublish</button>
          ) : (
            <button type="button" onClick={() => setPublished(true)} disabled={!allVerified}
              title={allVerified ? "Publish to the student site" : `${items.length - verifiedCount} items still unverified`}
              className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              Publish
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: sections + items + editor */}
        <div className="flex min-h-0 flex-1 lg:max-w-[52%]">
          <nav className="w-44 shrink-0 overflow-y-auto border-r border-line bg-surface p-2 text-sm">
            {sections.map(([s, c]) => (
              <button key={s} type="button" onClick={() => { setSection(s); setSelectedId(null); }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left ${s === section ? "bg-brand-tint font-semibold text-brand-strong" : "hover:bg-canvas"}`}>
                <span className="truncate">{SECTION_LABELS[s] ?? s}</span>
                <span className={`text-[11px] ${c.done === c.total ? "text-good" : "text-soft"}`}>{c.done}/{c.total}</span>
              </button>
            ))}
          </nav>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={showUnverifiedOnly} onChange={(e) => setShowUnverifiedOnly(e.target.checked)} /> Unverified only</label>
              <button type="button" onClick={verifySection} className="ml-auto rounded-full border border-line px-2 py-0.5 hover:border-brand">Verify whole section</button>
            </div>
            <div className="flex min-h-0 flex-1">
              <ul className="w-48 shrink-0 overflow-y-auto border-r border-line text-sm">
                {visible.map(({ item }) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => setSelectedId(item.id)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left ${selected?.item.id === item.id ? "bg-brand-tint" : "hover:bg-surface"}`}>
                      <span className={item.verified ? "text-good" : "text-soft"}>{item.verified ? "✓" : "○"}</span>
                      <span className="line-clamp-2">{itemTitle(item)}</span>
                    </button>
                  </li>
                ))}
                {visible.length === 0 && <li className="p-3 text-soft">Nothing here.</li>}
              </ul>
              <div className="min-w-0 flex-1 overflow-y-auto p-4">
                {selected && (
                  <ItemEditor key={selected.item.id} item={selected.item} pageCount={doc.source.pageCount}
                    onChange={(fn) => mutate(selected.path, fn)} onVerifyNext={verifyAndNext} onShowPage={setPage} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: brochure page */}
        <div className="flex min-h-[50vh] flex-1 flex-col border-l border-line bg-[#2b2b2b]">
          <div className="flex items-center gap-2 bg-surface px-3 py-2 text-sm">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-line px-2">‹</button>
            <span>Page</span>
            <input type="number" min={1} max={doc.source.pageCount} value={page}
              onChange={(e) => setPage(Math.min(doc.source.pageCount, Math.max(1, Number(e.target.value) || 1)))}
              className="w-14 rounded border border-line px-1" />
            <span className="text-soft">/ {doc.source.pageCount}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(doc.source.pageCount, p + 1))} className="rounded border border-line px-2">›</button>
            {selected && selected.item.sourcePages.length > 0 && (
              <span className="ml-auto flex gap-1 text-xs">
                Cited:
                {selected.item.sourcePages.map((p) => (
                  <button key={p} type="button" onClick={() => setPage(p)} className={`rounded px-1.5 ${p === page ? "bg-brand text-white" : "bg-brand-tint text-brand-strong"}`}>{p}</button>
                ))}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <img src={pageUrl(file, page, doc.source.pageCount)} alt={`Brochure page ${page}`} className="mx-auto w-full max-w-3xl bg-white shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  pageCount,
  onChange,
  onVerifyNext,
  onShowPage,
}: {
  item: Item;
  pageCount: number;
  onChange: (fn: (item: Item) => void) => void;
  onVerifyNext: () => void;
  onShowPage: (p: number) => void;
}) {
  const fields = Object.entries(item).filter(([k]) => !SYSTEM_KEYS.has(k));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">{item.id}</code>
        <label className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${item.verified ? "bg-good-tint text-good" : "bg-canvas"}`}>
          <input type="checkbox" checked={item.verified} onChange={(e) => onChange((it) => { it.verified = e.target.checked; })} />
          Verified
        </label>
        <button type="button" onClick={onVerifyNext} className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white hover:bg-brand-strong">Verify & next</button>
      </div>

      <label className="block text-xs font-semibold text-soft">
        Source pages (comma-separated)
        <input
          defaultValue={item.sourcePages.join(", ")}
          onBlur={(e) => {
            const pages = e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= pageCount);
            onChange((it) => { it.sourcePages = pages; });
            if (pages[0]) onShowPage(pages[0]);
          }}
          className="mt-1 block w-full rounded-lg border border-line px-2 py-1.5 text-sm font-normal text-ink"
        />
      </label>

      {fields.map(([key, value]) => (
        <FieldEditor key={key} name={key} value={value} onChange={(v) => onChange((it) => { it[key] = v; })} />
      ))}

      <label className="block text-xs font-semibold text-soft">
        Reviewer note (optional, shown nowhere publicly)
        <textarea
          defaultValue={item.note ?? ""}
          rows={2}
          onBlur={(e) => onChange((it) => { if (e.target.value.trim()) it.note = e.target.value; else delete it.note; })}
          className="mt-1 block w-full rounded-lg border border-line px-2 py-1.5 text-sm font-normal text-ink"
        />
      </label>
    </div>
  );
}

function FieldEditor({ name, value, onChange }: { name: string; value: unknown; onChange: (v: unknown) => void }) {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const cls = "mt-1 block w-full rounded-lg border border-line px-2 py-1.5 text-sm font-normal text-ink";
  const label = <span className="text-xs font-semibold text-soft">{name}</span>;

  if (typeof value === "string") {
    return (
      <label className="block">{label}
        <textarea defaultValue={value} rows={Math.min(8, Math.max(1, Math.ceil(value.length / 40)))} onBlur={(e) => onChange(e.target.value)} className={cls} />
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label className="block">{label}
        <input type="number" defaultValue={value} onBlur={(e) => onChange(Number(e.target.value))} className={cls} />
      </label>
    );
  }
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />{label}
      </label>
    );
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return (
      <label className="block">{label} <span className="text-[11px] text-soft">(one per line)</span>
        <textarea defaultValue={value.join("\n")} rows={Math.min(12, value.length + 1)}
          onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} className={cls} />
      </label>
    );
  }
  // Objects, conditions, effects, arrays of objects: edit as JSON.
  return (
    <label className="block">{label} <span className="text-[11px] text-soft">(JSON)</span>
      <textarea
        defaultValue={JSON.stringify(value, null, 2)}
        rows={Math.min(16, JSON.stringify(value, null, 2).split("\n").length)}
        onBlur={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
            setJsonError(null);
          } catch (err) {
            setJsonError(String(err));
          }
        }}
        className={`${cls} font-mono text-xs`}
      />
      {jsonError && <span className="text-xs text-bad">{jsonError}</span>}
    </label>
  );
}
