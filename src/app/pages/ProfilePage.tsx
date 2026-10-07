import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { states } from "../../data/states";
import {
  ABROAD,
  EMPTY_PROFILE,
  INDIAN_STATES,
  NONE,
  NOT_IN_SERVICE,
  SPECIALITIES,
  type Profile,
} from "../../engine/profile";
import { CATEGORIES, type Category } from "../../schema/stateBrochure";
import { formatDate, parseDate } from "../text";
import { useProfile } from "../useProfile";

const MAX_SPECIALITIES = 5;

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-soft">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Choice<T extends string | boolean>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3.5 py-2 text-sm transition-colors ${
              active ? "border-brand/60 bg-brand-tint text-brand-strong" : "border-line-strong bg-surface text-body hover:border-soft"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Date typed as DD-MM-YYYY (the app's only date format); stored as ISO for the engine. */
function DateInput({ id, value, onChange }: { id: string; value: string | null; onChange: (iso: string | null) => void }) {
  const [text, setText] = useState(value ? formatDate(value) : "");
  const invalid = text.trim() !== "" && parseDate(text) === null;
  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="DD-MM-YYYY"
        maxLength={10}
        aria-invalid={invalid}
        className={inputClass}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseDate(e.target.value));
        }}
      />
      {invalid && <p className="mt-1 text-xs text-bad">Enter a real date as DD-MM-YYYY, e.g. 30-06-2026.</p>}
    </>
  );
}

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function ProfilePage() {
  const { profile: saved, save } = useProfile();
  const [p, setP] = useState<Profile>(saved ?? EMPTY_PROFILE);
  const navigate = useNavigate();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  // Institutions a state's brochure singles out (e.g. AMU/BHU/AIIMS in UP), for the chosen MBBS state.
  const listedInstitutions = useMemo(() => {
    const names = states
      .filter((s) => s.brochure.meta.state === p.mbbsState)
      .flatMap((s) => s.brochure.eligibility.listedHomeInstitutions.names);
    return [...new Set(names)];
  }, [p.mbbsState]);

  // The chosen state's own in-service criteria (e.g. UP: DGHS PMHS list), when we have that state.
  const inServiceCriteria = useMemo(
    () =>
      states.find((s) => s.brochure.meta.state === p.inServiceState)?.brochure.eligibility.inServiceLabel.label ?? null,
    [p.inServiceState],
  );

  const toggleSpeciality = (s: string) =>
    set(
      "specialities",
      p.specialities.includes(s)
        ? p.specialities.filter((x) => x !== s)
        : p.specialities.length < MAX_SPECIALITIES
          ? [...p.specialities, s]
          : p.specialities,
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save(p);
    navigate(states.length === 1 ? `/state/${states[0].key}` : "/");
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Your profile</h1>
        <p className="mt-1 text-soft">
          Used to personalise every state's guide. It stays in this browser and is never sent anywhere. Skip anything
          you're unsure about and we'll tell you what's missing.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Exam & course</h2>
        <Field label="Which course are you applying for?">
          <Choice
            name="Course"
            value={p.courseType}
            onChange={(v) => set("courseType", v)}
            options={[
              { value: "clinical", label: "MD / MS / Diploma / DNB" },
              { value: "dental", label: "MDS" },
            ]}
          />
        </Field>
        <Field label="All India Rank (AIR)" hint="Saved for rank-based features. Brochures don't include cutoffs yet." htmlFor="air">
          <input
            id="air"
            type="number"
            min={1}
            inputMode="numeric"
            className={inputClass}
            value={p.air ?? ""}
            onChange={(e) => set("air", e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 12450"
          />
        </Field>
        <Field label="Preferred specialities" hint={`Pick up to ${MAX_SPECIALITIES}. ${p.specialities.length}/${MAX_SPECIALITIES} selected.`}>
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-lg border border-line p-3">
            {SPECIALITIES.map((s) => {
              const active = p.specialities.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSpeciality(s)}
                  className={`rounded-md border px-2.5 py-1 text-xs ${
                    active ? "border-brand/60 bg-brand-tint text-brand-strong" : "border-line text-body hover:border-soft"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="space-y-6 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Your MBBS / BDS</h2>
        <Field label="Where did you complete MBBS/BDS?" hint="Most state brochures decide eligibility on this." htmlFor="mbbs">
          <select
            id="mbbs"
            className={inputClass}
            value={p.mbbsState ?? ""}
            onChange={(e) => setP((prev) => ({ ...prev, mbbsState: e.target.value || null, mbbsInstitution: null }))}
          >
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value={ABROAD}>Abroad (foreign medical graduate)</option>
          </select>
        </Field>
        {listedInstitutions.length > 0 && (
          <Field label={`Was it one of these institutions in ${p.mbbsState}?`} htmlFor="inst">
            <select
              id="inst"
              className={inputClass}
              value={p.mbbsInstitution ?? ""}
              onChange={(e) => set("mbbsInstitution", e.target.value || null)}
            >
              <option value="">No, a state government or private college</option>
              {listedInstitutions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        )}
        <Field label="Internship completion date (DD-MM-YYYY)" hint="The date your one-year compulsory rotatory internship ends or ended." htmlFor="intern">
          <DateInput id="intern" value={p.internshipCompletion} onChange={(v) => set("internshipCompletion", v)} />
        </Field>
        <Field label="Are you presently admitted to a PG course on the basis of an earlier year's NEET-PG or NEET-MDS?" hint="Don't count a seat from this year's counselling, or one won through another exam such as INI-CET.">
          <Choice name="Currently in PG" value={p.currentlyInPG} onChange={(v) => set("currentlyInPG", v)}
            options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
        </Field>
        <Field label="Has a state's PG counselling admitted you before, to a course whose duration isn't over yet?" hint="Count it even if you left that seat. Some states (e.g. Gujarat) bar you from their counselling until that period ends." htmlFor="prior">
          <select id="prior" className={inputClass} value={p.priorAdmissionState ?? ""} onChange={(e) => set("priorAdmissionState", e.target.value || null)}>
            <option value="">Select…</option>
            <option value={NONE}>No</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>Yes, through {s} counselling</option>)}
          </select>
        </Field>
      </div>

      <div className="space-y-6 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">About you</h2>
        <Field label="Domicile state" htmlFor="dom">
          <select id="dom" className={inputClass} value={p.domicileState ?? ""} onChange={(e) => set("domicileState", e.target.value || null)}>
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="State where you were born" htmlFor="birth">
          <select id="birth" className={inputClass} value={p.birthState ?? ""} onChange={(e) => set("birthState", e.target.value || null)}>
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value={ABROAD}>Outside India</option>
          </select>
        </Field>
        <Field label="Where was your 12th-standard school?" hint="Some states (e.g. Gujarat) check this if you did MBBS elsewhere." htmlFor="school">
          <select id="school" className={inputClass} value={p.schoolState ?? ""} onChange={(e) => set("schoolState", e.target.value || null)}>
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value={ABROAD}>Outside India</option>
          </select>
        </Field>
        <Field
          label="Did you study at least 10 academic years (1st to 12th standard) in one state, and pass your 10th or 12th exam there?"
          hint="Count a class you took more than one year to pass as one year. Karnataka requires this for Government and GMP seats; if your parent was in the All India Service (Karnataka cadre) and posted outside the state, the years outside count too."
          htmlFor="tenyear"
        >
          <select id="tenyear" className={inputClass} value={p.tenYearStudyState ?? ""} onChange={(e) => set("tenYearStudyState", e.target.value || null)}>
            <option value="">Select…</option>
            <option value={NONE}>No, not 10 years in any one state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>Yes, in {s}</option>)}
          </select>
        </Field>
        <Field label="Are you, or your parents, Non-Resident Indians (NRI)?">
          <Choice name="NRI" value={p.nri} onChange={(v) => set("nri", v)}
            options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
        </Field>
        <Field label="Category" hint="OBC is called SEBC in Gujarat, and covers Category-1, 2A, 2B, 3A and 3B in Karnataka.">
          <Choice<Category> name="Category" value={p.category} onChange={(v) => set("category", v)}
            options={CATEGORIES.map((c) => ({ value: c, label: c === "UR" ? "General (UR)" : c }))} />
        </Field>
        <Field label="Do you have a benchmark disability (PwD)?">
          <Choice name="PwD" value={p.pwd} onChange={(v) => set("pwd", v)}
            options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
        </Field>
        <Field label="Are you an in-service doctor in a state government health service?" hint="For example, UP's PMHS cadre." htmlFor="inservice">
          <select id="inservice" className={inputClass} value={p.inServiceState ?? ""}
            onChange={(e) => setP((prev) => ({ ...prev, inServiceState: e.target.value || null, inServiceListed: null }))}>
            <option value="">Select…</option>
            <option value={NOT_IN_SERVICE}>No</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>Yes, in {s}</option>)}
          </select>
        </Field>
        {p.inServiceState && p.inServiceState !== NOT_IN_SERVICE && (
          <Field
            label={`Do you meet ${p.inServiceState}'s in-service criteria?`}
            hint={inServiceCriteria ? `${p.inServiceState} requires: ${inServiceCriteria}.` : "Being employed isn't always enough: states usually require you to be on an official list or sponsored with an NOC."}
          >
            <Choice name="In-service criteria" value={p.inServiceListed} onChange={(v) => set("inServiceListed", v)}
              options={[{ value: true, label: "Yes" }, { value: false, label: "No / not sure" }]} />
          </Field>
        )}
        <Field label="Nationality">
          <Choice name="Nationality" value={p.nationality} onChange={(v) => set("nationality", v)}
            options={[
              { value: "indian", label: "Indian" },
              { value: "oci", label: "OCI" },
              { value: "foreign", label: "Foreign national" },
            ]} />
        </Field>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => { save(null); setP(EMPTY_PROFILE); }}
          className="text-sm font-medium text-soft hover:text-bad"
        >
          Clear profile
        </button>
        <button type="submit" className="btn-primary">
          Save & see my results
        </button>
      </div>
    </form>
  );
}
