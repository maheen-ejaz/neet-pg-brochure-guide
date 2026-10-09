import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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
import { formatDate, formatDateNumeric, parseDate } from "../text";
import { radioProps } from "../components/radio";
import { useProfile } from "../useProfile";

const MAX_SPECIALITIES = 5;
const STEP_TITLES = [
  "Your course",
  "Where you studied",
  "About you",
  "Special situations",
];

const FieldLabelContext = createContext<string | undefined>(undefined);

function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  const labelId = useId();
  return (
    <div>
      {htmlFor ? (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-semibold text-ink"
        >
          {label}
        </label>
      ) : (
        <p id={labelId} className="block text-sm font-semibold text-ink">
          {label}
        </p>
      )}
      {hint && <p className="mt-0.5 text-xs text-soft">{hint}</p>}
      <FieldLabelContext.Provider value={htmlFor ? undefined : labelId}>
        <div className="mt-2">{children}</div>
      </FieldLabelContext.Provider>
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
  const labelId = useContext(FieldLabelContext);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : name}
      className="flex flex-wrap gap-2"
    >
      {options.map((o, i) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            {...radioProps(
              options.map((x) => x.value),
              value,
              i,
              onChange,
            )}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3.5 py-2 text-sm transition-colors ${
              active
                ? "border-brand/60 bg-brand-tint text-brand-strong"
                : "border-line-strong bg-surface text-body hover:border-soft"
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
function DateInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const [text, setText] = useState(value ? formatDateNumeric(value) : "");
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
        aria-describedby={
          invalid ? `${id}-error` : value ? `${id}-formatted` : undefined
        }
        className={inputClass}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseDate(e.target.value));
        }}
      />
      {invalid && (
        <p id={`${id}-error`} className="mt-1 text-xs text-bad">
          Enter a real date as DD-MM-YYYY, e.g. 30-06-2026.
        </p>
      )}
      {!invalid && value && (
        <p id={`${id}-formatted`} className="mt-1 text-xs text-soft">
          {formatDate(value)}
        </p>
      )}
    </>
  );
}

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function ProfilePage() {
  const { profile: saved, save } = useProfile();
  const [p, setP] = useState<Profile>(saved ?? EMPTY_PROFILE);
  const navigate = useNavigate();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

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
      states.find((s) => s.brochure.meta.state === p.inServiceState)?.brochure
        .eligibility.inServiceLabel.label ?? null,
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

  const [step, setStep] = useState(0);
  const stepButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const go = (i: number) => {
    setStep(i);
    window.scrollTo({ top: 0 });
  };
  const handleStepKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: number,
  ) => {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = Math.min(current + 1, STEP_TITLES.length - 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = Math.max(current - 1, 0);
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = STEP_TITLES.length - 1;
    if (next === null || next === current) return;
    event.preventDefault();
    stepButtonRefs.current[next]?.focus();
    go(next);
  };
  // One tap for the common case: not in service, never admitted before, no parent-service route.
  const noneApply = () =>
    setP((prev) => ({
      ...prev,
      inServiceState: NOT_IN_SERVICE,
      inServiceListed: null,
      priorAdmissionState: NONE,
      currentlyInPG: false,
      parentRouteState: NONE,
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save(p);
    navigate(states.length === 1 ? `/state/${states[0].key}` : "/");
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-2xl space-y-5"
      aria-describedby="profile-privacy-note"
    >
      <header className="page-heading block">
        <p className="eyebrow">Personalise your guide</p>
        <h1 className="text-3xl sm:text-4xl">Build your profile</h1>
        <p className="mt-1 max-w-2xl text-soft">
          Answer what you know to check state counselling rules. Leave anything
          uncertain blank; your guides will show where more detail is needed.
        </p>
      </header>

      <p
        id="profile-privacy-note"
        className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-soft"
      >
        Your answers are stored in this browser when you save your profile. They
        aren’t sent to GooCampus, and you can update or clear them at any time.
      </p>

      <section aria-label="Profile progress" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            Step {step + 1} of {STEP_TITLES.length}
          </p>
          <p className="text-sm text-soft">{STEP_TITLES[step]}</p>
        </div>
        <div
          role="progressbar"
          aria-label="Profile setup progress"
          aria-valuemin={1}
          aria-valuemax={STEP_TITLES.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${STEP_TITLES.length}`}
          className="h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
        </p>
      </section>

      <nav aria-label="Profile steps">
        <ol className="flex gap-1.5">
          {STEP_TITLES.map((t, i) => (
            <li key={t} className="flex-1">
              <button
                ref={(el) => {
                  stepButtonRefs.current[i] = el;
                }}
                id={`profile-step-${i + 1}`}
                type="button"
                onClick={() => go(i)}
                onKeyDown={(event) => handleStepKeyDown(event, i)}
                aria-current={step === i ? "step" : undefined}
                aria-label={`Step ${i + 1} of ${STEP_TITLES.length}: ${t}`}
                className={`block w-full border-t-2 pt-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${i <= step ? "border-brand text-ink" : "border-line text-soft"} ${step === i ? "font-semibold" : ""}`}
              >
                <span className="block text-xs uppercase tracking-wide text-soft">
                  Step {i + 1}
                </span>
                <span className="mt-0.5 block">{t}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {step === 0 && (
        <section
          className="card space-y-6 p-5 sm:p-6"
          aria-labelledby="profile-step-title-1"
        >
          <h2 id="profile-step-title-1" className="text-lg font-semibold">
            Your course
          </h2>
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
          <Field
            label="Internship completion date (DD-MM-YYYY)"
            hint="The date your one-year compulsory rotatory internship ends or ended."
            htmlFor="intern"
          >
            <DateInput
              id="intern"
              value={p.internshipCompletion}
              onChange={(v) => set("internshipCompletion", v)}
            />
          </Field>
        </section>
      )}
      {step === 1 && (
        <section
          className="card space-y-6 p-5 sm:p-6"
          aria-labelledby="profile-step-title-2"
        >
          <h2 id="profile-step-title-2" className="text-lg font-semibold">
            Where you studied
          </h2>
          <Field
            label="Where did you complete MBBS/BDS?"
            hint="Most state brochures decide eligibility on this."
            htmlFor="mbbs"
          >
            <select
              id="mbbs"
              className={inputClass}
              value={p.mbbsState ?? ""}
              onChange={(e) =>
                setP((prev) => ({
                  ...prev,
                  mbbsState: e.target.value || null,
                  mbbsInstitution: null,
                }))
              }
            >
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={ABROAD}>Abroad (foreign medical graduate)</option>
            </select>
          </Field>
          {listedInstitutions.length > 0 && (
            <Field
              label={`Was it one of these institutions in ${p.mbbsState}?`}
              htmlFor="inst"
            >
              <select
                id="inst"
                className={inputClass}
                value={p.mbbsInstitution ?? ""}
                onChange={(e) => set("mbbsInstitution", e.target.value || null)}
              >
                <option value="">
                  No, a state government or private college
                </option>
                {listedInstitutions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field
            label="Where was your 12th-standard school?"
            hint="Some states (e.g. Gujarat) check this if you did MBBS elsewhere."
            htmlFor="school"
          >
            <select
              id="school"
              className={inputClass}
              value={p.schoolState ?? ""}
              onChange={(e) => set("schoolState", e.target.value || null)}
            >
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={ABROAD}>Outside India</option>
            </select>
          </Field>
          <Field
            label="Did you study at least 10 academic years (1st to 12th standard) in one state, and pass your 10th or 12th exam there?"
            hint="Count a class you took more than one year to pass as one year. Karnataka requires this for Government and GMP seats; if your parent was in the All India Service (Karnataka cadre) and posted outside the state, the years outside count too."
            htmlFor="tenyear"
          >
            <select
              id="tenyear"
              className={inputClass}
              value={p.tenYearStudyState ?? ""}
              onChange={(e) => set("tenYearStudyState", e.target.value || null)}
            >
              <option value="">Select…</option>
              <option value={NONE}>No, not 10 years in any one state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  Yes, in {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="State where you were born" htmlFor="birth">
            <select
              id="birth"
              className={inputClass}
              value={p.birthState ?? ""}
              onChange={(e) => set("birthState", e.target.value || null)}
            >
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={ABROAD}>Outside India</option>
            </select>
          </Field>
          <Field label="Domicile state" htmlFor="dom">
            <select
              id="dom"
              className={inputClass}
              value={p.domicileState ?? ""}
              onChange={(e) => set("domicileState", e.target.value || null)}
            >
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </section>
      )}
      {step === 2 && (
        <section
          className="card space-y-6 p-5 sm:p-6"
          aria-labelledby="profile-step-title-3"
        >
          <h2 id="profile-step-title-3" className="text-lg font-semibold">
            About you
          </h2>
          <Field
            label="Category"
            hint="OBC is called SEBC in Gujarat, and covers Category-1, 2A, 2B, 3A and 3B in Karnataka."
          >
            <Choice<Category>
              name="Category"
              value={p.category}
              onChange={(v) => set("category", v)}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: c === "UR" ? "General (UR)" : c,
              }))}
            />
          </Field>
          <Field label="Do you have a benchmark disability (PwD)?">
            <Choice
              name="PwD"
              value={p.pwd}
              onChange={(v) => set("pwd", v)}
              options={[
                { value: false, label: "No" },
                { value: true, label: "Yes" },
              ]}
            />
          </Field>
          <Field label="Nationality">
            <Choice
              name="Nationality"
              value={p.nationality}
              onChange={(v) => set("nationality", v)}
              options={[
                { value: "indian", label: "Indian" },
                { value: "oci", label: "OCI" },
                { value: "foreign", label: "Foreign national" },
              ]}
            />
          </Field>
          <Field
            label="Is anyone a Non-Resident Indian (NRI) for your application?"
            hint="States differ: Gujarat accepts your parents, or a legal guardian only if your parents are absent; Karnataka also accepts NRI wards sponsored by a relative."
            htmlFor="nri"
          >
            <select
              id="nri"
              className={inputClass}
              value={p.nriLink ?? ""}
              onChange={(e) =>
                set("nriLink", (e.target.value || null) as Profile["nriLink"])
              }
            >
              <option value="">Select…</option>
              <option value="none">No one</option>
              <option value="self">I am an NRI</option>
              <option value="parent">My parent(s)</option>
              <option value="guardian">
                My legal guardian (my parents are absent)
              </option>
              <option value="relative">
                Another relative who will sponsor me as an NRI ward
              </option>
            </select>
          </Field>
        </section>
      )}
      {step === 3 && (
        <section
          className="card space-y-6 p-5 sm:p-6"
          aria-labelledby="profile-step-title-4"
        >
          <div>
            <h2 id="profile-step-title-4" className="text-lg font-semibold">
              Special situations
            </h2>
            <p className="mt-1 text-sm text-soft">
              Answer what applies to you. If you’re unsure, leave it blank and
              review the state guide for details.
            </p>
          </div>
          <button
            type="button"
            onClick={noneApply}
            className="btn-secondary !py-1.5"
          >
            None of these apply to me
          </button>
          <Field
            label="Are you an in-service doctor in a state government health service?"
            hint="For example, UP's PMHS cadre."
            htmlFor="inservice"
          >
            <select
              id="inservice"
              className={inputClass}
              value={p.inServiceState ?? ""}
              onChange={(e) =>
                setP((prev) => ({
                  ...prev,
                  inServiceState: e.target.value || null,
                  inServiceListed: null,
                }))
              }
            >
              <option value="">Select…</option>
              <option value={NOT_IN_SERVICE}>No</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  Yes, in {s}
                </option>
              ))}
            </select>
          </Field>
          {p.inServiceState && p.inServiceState !== NOT_IN_SERVICE && (
            <Field
              label={`Do you meet ${p.inServiceState}'s in-service criteria?`}
              hint={
                inServiceCriteria
                  ? `${p.inServiceState} requires: ${inServiceCriteria}.`
                  : "Being employed isn't always enough: states usually require you to be on an official list or sponsored with an NOC."
              }
            >
              <Choice
                name="In-service criteria"
                value={p.inServiceListed}
                onChange={(v) => set("inServiceListed", v)}
                options={[
                  { value: true, label: "Yes" },
                  { value: false, label: "No / not sure" },
                ]}
              />
            </Field>
          )}
          <Field
            label="Has a state's PG counselling admitted you before, to a course whose duration isn't over yet?"
            hint="Count it even if you left that seat. Some states (e.g. Gujarat) bar you from their counselling until that period ends."
            htmlFor="prior"
          >
            <select
              id="prior"
              className={inputClass}
              value={p.priorAdmissionState ?? ""}
              onChange={(e) =>
                set("priorAdmissionState", e.target.value || null)
              }
            >
              <option value="">Select…</option>
              <option value={NONE}>No</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  Yes, through {s} counselling
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Are you presently admitted to a PG course on the basis of an earlier year's NEET-PG or NEET-MDS?"
            hint="Don't count a seat from this year's counselling, or one won through another exam such as INI-CET."
          >
            <Choice
              name="Currently in PG"
              value={p.currentlyInPG}
              onChange={(v) => set("currentlyInPG", v)}
              options={[
                { value: false, label: "No" },
                { value: true, label: "Yes" },
              ]}
            />
          </Field>
          <Field
            label="Does a parent's service give you a home-state route in some state?"
            hint="For example Karnataka clauses d–g: a parent in the All India Service (state cadre), a central government/PSU or defence employee who declared a home town there, or an MP elected from there."
            htmlFor="parentroute"
          >
            <select
              id="parentroute"
              className={inputClass}
              value={p.parentRouteState ?? ""}
              onChange={(e) => set("parentRouteState", e.target.value || null)}
            >
              <option value="">Select…</option>
              <option value={NONE}>No</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  Yes, in {s}
                </option>
              ))}
            </select>
          </Field>
          <div className="rounded-lg border border-line bg-canvas/50 px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              Ready to check your state guides?
            </p>
            <p className="mt-1 text-sm text-soft">
              Save your profile to review eligibility by state. You can return
              here to update your answers.
            </p>
          </div>
        </section>
      )}
      {step === 3 && (
        <details className="card">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-ink sm:px-6">
            Optional: AIR and preferred specialities
          </summary>
          <div className="space-y-6 px-5 pb-5 sm:px-6">
            <p className="text-sm text-soft">
              These details don’t affect eligibility. This guide doesn’t predict
              ranks or cutoffs.
            </p>
            <Field
              label="All India Rank (AIR)"
              hint="Optional. This guide does not use AIR to predict ranks or cutoffs."
              htmlFor="air"
            >
              <input
                id="air"
                type="number"
                min={1}
                inputMode="numeric"
                className={inputClass}
                value={p.air ?? ""}
                onChange={(e) =>
                  set("air", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="e.g. 12450"
              />
            </Field>
            <Field
              label="Preferred specialities"
              hint={`Pick up to ${MAX_SPECIALITIES}. These preferences don’t affect eligibility. ${p.specialities.length}/${MAX_SPECIALITIES} selected.`}
            >
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
                        active
                          ? "border-brand/60 bg-brand-tint text-brand-strong"
                          : "border-line text-body hover:border-soft"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </details>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            save(null);
            setP(EMPTY_PROFILE);
          }}
          className="link text-sm font-medium !text-soft hover:!text-bad"
        >
          Clear profile
        </button>
        <span className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="btn-secondary"
            >
              Back
            </button>
          )}
          {step < STEP_TITLES.length - 1 ? (
            // Distinct keys: if React reused this node, the click on "Next" would land on the submit button.
            <button
              key="next"
              type="button"
              onClick={() => go(step + 1)}
              className="btn-primary"
            >
              Next
            </button>
          ) : (
            <button key="save" type="submit" className="btn-primary">
              Save profile & view eligibility
            </button>
          )}
        </span>
      </div>
    </form>
  );
}
