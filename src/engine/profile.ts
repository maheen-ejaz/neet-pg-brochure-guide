import type { Category } from "../schema/stateBrochure";

/** A candidate's inputs. Stored only in the browser. Unknown answers are null. */
export interface Profile {
  air: number | null;
  courseType: "clinical" | "dental" | null;
  /** Indian state/UT where MBBS/BDS was done, or "abroad". */
  mbbsState: string | null;
  /** Name of a listed home-state institution (e.g. AMU) if applicable, else null. */
  mbbsInstitution: string | null;
  domicileState: string | null;
  /** State where the candidate's 12th-standard school is located. */
  schoolState: string | null;
  /**
   * State where the candidate studied at least 10 academic years between 1st and 12th standard,
   * passing their 10th or 12th exam there, or NONE (e.g. Karnataka's clause b/c). At most one
   * state can qualify, since 1st–12th is 12 years.
   */
  tenYearStudyState: string | null;
  birthState: string | null;
  /** Candidate or their parents are Non-Resident Indians. */
  nri: boolean | null;
  category: Category | null;
  pwd: boolean | null;
  /** State whose government health service employs the candidate, if any. */
  inServiceState: string | null;
  /**
   * Whether the candidate meets that state's own in-service criteria (e.g. UP: on the DGHS
   * PMHS list; Gujarat: NOC from a state competent authority). Employment alone isn't enough.
   */
  inServiceListed: boolean | null;
  /**
   * State whose PG counselling previously admitted the candidate to a seat whose course period
   * isn't over yet, or NONE. Some states bar such candidates (e.g. Gujarat Rule 4(4)).
   */
  priorAdmissionState: string | null;
  internshipCompletion: string | null;
  /** Presently admitted to a PG course on the basis of an EARLIER year's NEET-PG/NEET-MDS. */
  currentlyInPG: boolean | null;
  nationality: "indian" | "oci" | "foreign" | null;
  specialities: string[];
}

export const EMPTY_PROFILE: Profile = {
  air: null,
  courseType: null,
  mbbsState: null,
  mbbsInstitution: null,
  domicileState: null,
  schoolState: null,
  tenYearStudyState: null,
  birthState: null,
  nri: null,
  category: null,
  pwd: null,
  inServiceState: null,
  inServiceListed: null,
  priorAdmissionState: null,
  internshipCompletion: null,
  currentlyInPG: null,
  nationality: null,
  specialities: [],
};

export const ABROAD = "abroad";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

export const SPECIALITIES = [
  "Anaesthesiology", "Anatomy", "Biochemistry", "Community Medicine", "Dermatology, Venereology & Leprosy",
  "Emergency Medicine", "ENT (Otorhinolaryngology)", "Family Medicine", "Forensic Medicine", "General Medicine",
  "General Surgery", "Geriatrics", "Hospital Administration", "Immunohaematology & Blood Transfusion",
  "Microbiology", "Nuclear Medicine", "Obstetrics & Gynaecology", "Ophthalmology", "Orthopaedics", "Paediatrics",
  "Palliative Medicine", "Pathology", "Pharmacology", "Physical Medicine & Rehabilitation", "Physiology",
  "Psychiatry", "Radiation Oncology", "Radiodiagnosis", "Respiratory Medicine", "Sports Medicine",
  "Tropical Medicine",
  // MDS
  "Conservative Dentistry & Endodontics", "Oral & Maxillofacial Surgery", "Oral Medicine & Radiology",
  "Oral Pathology", "Orthodontics", "Paediatric Dentistry", "Periodontology", "Prosthodontics",
  "Public Health Dentistry",
];

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  courseType: "the course you're applying for",
  mbbsLocation: "where you did MBBS/BDS",
  category: "your category",
  isDomicile: "your domicile state",
  pwd: "whether you have a benchmark disability",
  inService: "whether you meet the state's in-service criteria",
  priorAdmissionInState: "whether this state's counselling admitted you to a PG seat before",
  currentlyInPG: "whether you're admitted to a PG course through an earlier NEET-PG/MDS",
  nationality: "your nationality",
  schooledInState: "where you did 12th standard",
  studied10YearsInState: "where you studied 10 years of school (1st–12th standard)",
  bornInState: "your state of birth",
  isNri: "whether you or your parents are NRI",
  internshipCompletion: "your internship completion date",
};

/** inServiceState / priorAdmissionState value meaning "no" (not in service / never admitted). */
export const NONE = "none";
export const NOT_IN_SERVICE = NONE;
