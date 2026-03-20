import { useState, useEffect, useCallback } from "react";

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  maroon: "#6B1F2A", gold: "#C9973A", goldLight: "#E0B860",
  cream: "#FAF6EF", creamDark: "#F0E8D8", text: "#2A1A1E",
  muted: "#7A6068", border: "#DDD0C0", white: "#FFFFFF",
  S: "#B05520", O: "#1A5C6B", A: "#3B5E2B", P: "#4A3570",
  softTissue: "#5C3A1E", joint: "#1E3A5C",
};

const SOAP_TABS = ["S", "O", "A", "P"];
const SOAP_LABELS = { S: "Subjective", O: "Objective", A: "Action", P: "Prescription" };

// ─── Storage helpers ──────────────────────────────────────────────────────────

const CLIENTS_KEY = "eadig_clients_v1";
const SESSIONS_KEY = "eadig_sessions_v1";
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const storage = {
  async getClients() {
    try {
      const r = await window.storage.get(CLIENTS_KEY);
      return r ? JSON.parse(r.value) : [];
    } catch { return []; }
  },
  async saveClients(clients) {
    try { await window.storage.set(CLIENTS_KEY, JSON.stringify(clients)); } catch (e) { console.error(e); }
  },
  async getSessions() {
    try {
      const r = await window.storage.get(SESSIONS_KEY);
      return r ? JSON.parse(r.value) : [];
    } catch { return []; }
  },
  async saveSessions(sessions) {
    try { await window.storage.set(SESSIONS_KEY, JSON.stringify(sessions)); } catch (e) { console.error(e); }
  },
};

// ─── Canonical regions ────────────────────────────────────────────────────────

const CANONICAL_REGIONS = [
  "Cranial", "Cervical", "Thoracic", "Shoulder", "Lumbar / Sacral",
  "Hip", "Knee", "Elbow & Forearm", "Wrist & Hand", "Thigh",
  "Lower Leg & Calf", "Ankle & Foot",
];

// ─── Region modifiers ─────────────────────────────────────────────────────────

const REGION_MODIFIERS = {
  "Cranial":          [{ plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Position", terms: ["Superior","Lateral","Vertex"] }],
  "Cervical":         [{ plane: "Sagittal", terms: ["Left","Right"] }, { plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Transverse", terms: ["Superior","Inferior"] }, { plane: "Position", terms: ["Lateral"] }],
  "Thoracic":         [{ plane: "Sagittal", terms: ["Left","Right"] }, { plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Transverse", terms: ["Superior","Middle","Inferior"] }, { plane: "Position", terms: ["Lateral","Medial"] }],
  "Shoulder":         [{ plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Transverse", terms: ["Superior","Inferior"] }, { plane: "Position", terms: ["Lateral","Medial"] }],
  "Lumbar / Sacral":  [{ plane: "Sagittal", terms: ["Left","Right"] }, { plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Transverse", terms: ["Superior","Inferior"] }, { plane: "Position", terms: ["Lateral","Central"] }],
  "Hip":              [{ plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Transverse", terms: ["Superior","Inferior"] }, { plane: "Position", terms: ["Lateral","Medial"] }],
  "Knee":             [{ plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Transverse", terms: ["Superior","Inferior"] }, { plane: "Position", terms: ["Medial","Lateral"] }],
  "Elbow & Forearm":  [{ plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Position", terms: ["Medial","Lateral","Proximal","Distal"] }],
  "Wrist & Hand":     [{ plane: "Coronal", terms: ["Dorsal","Palmar"] }, { plane: "Position", terms: ["Radial","Ulnar","Proximal","Distal"] }],
  "Thigh":            [{ plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Position", terms: ["Medial","Lateral","Proximal","Distal"] }],
  "Lower Leg & Calf": [{ plane: "Coronal", terms: ["Anterior","Posterior"] }, { plane: "Position", terms: ["Medial","Lateral","Proximal","Distal"] }],
  "Ankle & Foot":     [{ plane: "Coronal", terms: ["Anterior","Posterior","Dorsal","Plantar"] }, { plane: "Position", terms: ["Medial","Lateral"] }],
};

// ─── Techniques ───────────────────────────────────────────────────────────────

const SOFT_TISSUE_TECHNIQUES = [
  "General soft tissue", "MFR (Myofascial release)", "TrP (Trigger point therapy)",
  "Cross-fibre friction", "Pin and stretch", "Passive stretch", "PNF stretch",
  "MET (Muscle energy technique)", "Dry needling", "Cupping",
];
const JOINT_TECHNIQUES = ["Joint mobilisation", "Traction", "Scapular mobilisation"];

// ─── Treatment hierarchy ──────────────────────────────────────────────────────

const TREATMENT_HIERARCHY = {
  "Cranial":          { softTissue: ["Scalp / galea aponeurotica","Temporalis","Masseter","Pterygoid region","Facial muscles","Occipitals"], joints: ["TMJ (L)","TMJ (R)"] },
  "Cervical":         { softTissue: ["Upper trapezius","Levator scapulae","Suboccipitals","Scalenes","SCM","Cervical extensors","Cervical flexors"], joints: ["Upper cervical (C0–C2)","Lower cervical (C3–C7)","CTJ"] },
  "Thoracic":         { softTissue: ["Thoracic erectors","Middle trapezius","Lower trapezius","Rhomboids","Latissimus dorsi","Thoracolumbar fascia","Intercostals"], joints: ["Thoracic facets","Costovertebral joints","CTJ","TLJ"] },
  "Shoulder":         { softTissue: ["Rotator cuff region","Upper trapezius","Levator scapulae","Deltoid","Pec major","Pec minor","Latissimus dorsi","Rhomboids","Serratus anterior"], joints: ["GHJ","ACJ","SCJ","Scapulothoracic"] },
  "Lumbar / Sacral":  { softTissue: ["Lumbar erectors","Quadratus lumborum","Multifidus region","Psoas / iliacus region","Piriformis","Gluteal region","Thoracolumbar fascia"], joints: ["Lumbar facets","L5–S1","SIJ (L)","SIJ (R)","TLJ"] },
  "Hip":              { softTissue: ["Glute max","Glute med / min","TFL","Adductor group","Hip flexor region","Deep hip rotators"], joints: ["Hip joint (AFJ)","Anterior hip","Posterior hip"] },
  "Knee":             { softTissue: ["Quadriceps group","Hamstring insertions","IT band region","Popliteal region","Calf origin region"], joints: ["Tibiofemoral joint","Patellofemoral joint","Proximal tib-fib joint"] },
  "Elbow & Forearm":  { softTissue: ["Wrist extensor group","Wrist flexor group","Brachioradialis","Biceps tendon region","Supinator / pronator region"], joints: ["Humeroulnar joint","Humeroradial joint","Proximal radioulnar joint"] },
  "Wrist & Hand":     { softTissue: ["Forearm flexor group","Forearm extensor group","Thenar region","Hypothenar region","Intrinsic hand region"], joints: ["Radiocarpal joint","Midcarpal region","Thumb CMC","MCP / IP region"] },
  "Thigh":            { softTissue: ["Quadriceps group","Hamstring group","Adductor group","IT band region"], joints: [] },
  "Lower Leg & Calf": { softTissue: ["Gastrocnemius","Soleus","Tibialis anterior","Peroneal group","Deep posterior calf","Achilles tendon region"], joints: ["Proximal tib-fib joint","Distal tib-fib joint"] },
  "Ankle & Foot":     { softTissue: ["Plantar fascia region","Intrinsic foot region","Peroneal tendons","Achilles tendon region"], joints: ["Talocrural joint","Subtalar joint","Midfoot region","MTP region"] },
};

// ─── SOCRATES ─────────────────────────────────────────────────────────────────

const SOCRATES_FIELDS = [
  { key: "site", letter: "S", label: "Site", type: "site", regionField: { key: "region", label: "Region", options: [...CANONICAL_REGIONS] } },
  { key: "onset", letter: "O", label: "Onset", type: "single", options: ["Acute — less than 2 weeks","Subacute — 2 to 12 weeks","Chronic — more than 12 weeks","Recurrent"] },
  { key: "character", letter: "C", label: "Character", type: "single", options: ["Aching","Sharp / stabbing","Burning","Throbbing","Dull / pressure","Cramping","Shooting","Tightness / stiffness"] },
  { key: "radiation", letter: "R", label: "Radiation", type: "single", options: ["No radiation","Local spread","Radiates to arm","Radiates to leg","Radiates to head","Radiates to chest","Dermatomal pattern"] },
  { key: "associations", letter: "A", label: "Associations", type: "single", options: ["None reported","Numbness / tingling","Weakness","Swelling","Clicking / crepitus","Headaches","Dizziness","Multiple symptoms"] },
  { key: "timing", letter: "T", label: "Time course", type: "single", options: ["Constant","Intermittent","Morning stiffness","End-of-day worsening","Activity-related","Night pain","Improving","Worsening"] },
  { key: "exacerbating", letter: "E", label: "Exacerbating & relieving", type: "multiDouble", fields: [
    { key: "exacerbating", label: "Made worse by", options: ["Movement","Rest","Prolonged posture","Loading / lifting","Cold","Heat","Stress","Morning","Night"] },
    { key: "relieving", label: "Relieved by", options: ["Rest","Movement","Heat","Ice","Analgesia","Massage","Stretching","Sleep","Position change"] },
  ]},
  { key: "severity", letter: "S", label: "Severity", type: "double", fields: [
    { key: "severityRest", label: "At rest (0–10)", options: ["0","1","2","3","4","5","6","7","8","9","10"] },
    { key: "severityWorst", label: "At worst (0–10)", options: ["0","1","2","3","4","5","6","7","8","9","10"] },
  ]},
];

// ─── Objective config ─────────────────────────────────────────────────────────

const GLOBAL_SYMPTOM_TESTS = [
  { id: "pain-nrs",     label: "Pain — NRS",       results: ["0–2 (minimal)","3–5 (moderate)","6–8 (severe)","9–10 (extreme)"], outcomes: ["Improved","No change","Worsened"] },
  { id: "pain-quality", label: "Pain quality",      results: ["Aching","Sharp","Burning","Throbbing","Diffuse","Referred"],       outcomes: ["Improved","No change","Worsened"] },
  { id: "symp-24h",     label: "24-hour behaviour", results: ["Morning stiffness","Activity-related","Constant","Night pain"],    outcomes: ["Improved","No change","Worsened"] },
];

const OBJECTIVE_CONFIG = {
  "Cranial": {
    "Movement / ROM": [
      { id: "tmj-opening", label: "TMJ — mouth opening", results: ["Full","Restricted","Painful","Deflection present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "tmj-lat-dev", label: "TMJ — lateral deviation", results: ["Symmetrical","Restricted left","Restricted right"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "tmj-play-l", label: "TMJ joint play (L)", results: ["Normal","Restricted","Painful","Click present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "tmj-play-r", label: "TMJ joint play (R)", results: ["Normal","Restricted","Painful","Click present"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-temporalis", label: "Palpation — temporalis", results: ["Nil tenderness","Mild tenderness","Moderate tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-masseter",   label: "Palpation — masseter",   results: ["Nil tenderness","Mild tenderness","Moderate tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-occipitals", label: "Palpation — occipitals", results: ["Nil tenderness","Mild tenderness","Guarding"],                          outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Cervical": {
    "Movement / ROM": [
      { id: "arom-flex",  label: "AROM — Flexion",          results: ["Full ROM","Reduced ROM","Painful","Pain at end range"],                outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-ext",   label: "AROM — Extension",        results: ["Full ROM","Reduced ROM","Painful","Pain at end range"],                outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-rot-l", label: "AROM — Rotation (L)",     results: ["Full ROM","Reduced ROM","Painful","Pain at end range","Compensated"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-rot-r", label: "AROM — Rotation (R)",     results: ["Full ROM","Reduced ROM","Painful","Pain at end range","Compensated"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-sf-l",  label: "AROM — Side flexion (L)", results: ["Full ROM","Reduced ROM","Painful","Pain at end range"],                outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-sf-r",  label: "AROM — Side flexion (R)", results: ["Full ROM","Reduced ROM","Painful","Pain at end range"],                outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "paivm-upper", label: "PAIVM — Upper cervical", results: ["Normal","Stiff","Painful","Restricted","Reproduces symptoms"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "paivm-lower", label: "PAIVM — Lower cervical", results: ["Normal","Stiff","Painful","Restricted","Reproduces symptoms"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "paivm-ctj",   label: "PAIVM — CTJ",            results: ["Normal","Stiff","Painful","Restricted"],                       outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-ut",       label: "Palpation — Upper trapezius",  results: ["Nil tenderness","Mild tenderness","Moderate tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-lev",      label: "Palpation — Levator scapulae", results: ["Nil tenderness","Mild tenderness","Moderate tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-subocc",   label: "Palpation — Suboccipitals",    results: ["Nil tenderness","Mild tenderness","Guarding"],                           outcomes: ["Improved","No change","Aggravated"] },
      { id: "length-scalene",label: "Length — Scalenes",            results: ["Normal length","Shortened","Guarding","Reproduces symptoms"],            outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Thoracic": {
    "Movement / ROM": [
      { id: "arom-rot",  label: "AROM — Rotation",   results: ["Full ROM","Reduced ROM","Painful","Stiff"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-ext",  label: "AROM — Extension",  results: ["Full ROM","Reduced ROM","Painful","Stiff"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "breathing", label: "Breathing pattern", results: ["Normal","Restricted expansion","Asymmetrical"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "paivm-thor", label: "PAIVM — Thoracic", results: ["Normal","Stiff","Painful","Restricted"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "rib-spring", label: "Rib spring",        results: ["Normal","Restricted","Painful"],        outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-rhomboids", label: "Palpation — Rhomboids",         results: ["Nil tenderness","Mild tenderness","Moderate tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-t-erect",   label: "Palpation — Thoracic erectors", results: ["Normal tone","Hypertonic","Tender","Guarding"],                         outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Shoulder": {
    "Movement / ROM": [
      { id: "arom-abd",        label: "AROM — Abduction",              results: ["Full ROM","Reduced ROM","Painful","Pain at end range","Compensated"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-flex",       label: "AROM — Flexion",                results: ["Full ROM","Reduced ROM","Painful","Pain at end range","Compensated"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-er",         label: "AROM — External rotation",      results: ["Full ROM","Reduced ROM","Painful","Pain at end range"],               outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-ir",         label: "AROM — Internal rotation",      results: ["Full ROM","Reduced ROM","Painful"],                                    outcomes: ["Improved","No change","Aggravated"] },
      { id: "func-hbb",        label: "Functional — Hand behind back", results: ["Full range","Limited","Pain-limited"],                                 outcomes: ["Improved","No change","Aggravated"] },
      { id: "painful-arc",     label: "Painful arc",                   results: ["Present","Absent"],                                                    outcomes: ["Improved","No change","Aggravated"] },
      { id: "scap-dyskinesis", label: "Scapular dyskinesis",           results: ["Present","Absent"],                                                    outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "ghj-play",  label: "Joint play — GHJ",  results: ["Normal","Restricted","Painful","Stiff"],                  outcomes: ["Improved","No change","Aggravated"] },
      { id: "acj-comp",  label: "ACJ compression",   results: ["Negative","Positive — local pain","Positive — referred"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-rc",      label: "Palpation — Rotator cuff region", results: ["Nil tenderness","Mild tenderness","Moderate tenderness","Severe tenderness"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-pec-min", label: "Palpation — Pec minor",           results: ["Nil tenderness","Mild tenderness","Guarding"],                               outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-ut",      label: "Palpation — Upper trapezius",     results: ["Nil tenderness","Mild tenderness","TrP present"],                             outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Lumbar / Sacral": {
    "Movement / ROM": [
      { id: "arom-flex", label: "AROM — Flexion",   results: ["Full ROM","Reduced ROM","Painful","Pain at end range"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-ext",  label: "AROM — Extension", results: ["Full ROM","Reduced ROM","Painful","Pain at end range"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-rot",  label: "AROM — Rotation",  results: ["Full ROM","Reduced ROM","Painful","Compensated"],       outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-sf",   label: "AROM — Side flex", results: ["Full ROM","Reduced ROM","Painful","Compensated"],       outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "paivm-lum",  label: "PAIVM — Lumbar",     results: ["Normal","Stiff","Painful","Restricted"],          outcomes: ["Improved","No change","Aggravated"] },
      { id: "joint-l5s1", label: "Joint play — L5–S1", results: ["Normal","Restricted","Painful"],                  outcomes: ["Improved","No change","Aggravated"] },
      { id: "sij-spring", label: "SIJ compression",    results: ["Negative","Positive (L)","Positive (R)"],         outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-ql",       label: "Palpation — QL",              results: ["Nil tenderness","Mild tenderness","Moderate tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-l-erect",  label: "Palpation — Lumbar erectors", results: ["Normal tone","Hypertonic","Tender","Guarding"],                         outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-piriform", label: "Palpation — Piriformis",      results: ["Nil tenderness","Mild tenderness","TrP present"],                       outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Hip": {
    "Movement / ROM": [
      { id: "arom-hip-flex", label: "AROM — Hip flexion",       results: ["Full ROM","Reduced ROM","Painful","Compensated"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-hip-ir",   label: "AROM — Internal rotation", results: ["Full ROM","Reduced ROM","Painful"],               outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-hip-er",   label: "AROM — External rotation", results: ["Full ROM","Reduced ROM","Painful"],               outcomes: ["Improved","No change","Aggravated"] },
      { id: "trendelenburg", label: "Trendelenburg sign",        results: ["Negative","Positive (L)","Positive (R)"],        outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "hip-joint-play", label: "Joint play — AFJ",  results: ["Normal","Restricted","Painful","Stiff"],                 outcomes: ["Improved","No change","Aggravated"] },
      { id: "faber-response", label: "FABER response",    results: ["Negative","Positive — local pain","Positive — referred"],outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-glute-med", label: "Palpation — Glute med / min",   results: ["Nil tenderness","Mild tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-deep-hip",  label: "Palpation — Deep hip rotators", results: ["Nil tenderness","Mild tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-tfl",       label: "Palpation — TFL",               results: ["Nil tenderness","Mild tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Knee": {
    "Movement / ROM": [
      { id: "arom-flex", label: "AROM — Knee flexion",   results: ["Full ROM","Reduced ROM","Painful","Pain at end range"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-ext",  label: "AROM — Knee extension", results: ["Full ROM","Reduced ROM","Painful","Lag present"],       outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "tfj-play",  label: "Joint play — Tibiofemoral", results: ["Normal","Restricted","Painful"],             outcomes: ["Improved","No change","Aggravated"] },
      { id: "pfj-grind", label: "Patellofemoral grind",      results: ["Negative","Positive","Crepitus only"],       outcomes: ["Improved","No change","Aggravated"] },
      { id: "valgus-st", label: "Valgus stress test",        results: ["Negative","Positive — laxity","Painful"],    outcomes: ["Improved","No change","Aggravated"] },
      { id: "varus-st",  label: "Varus stress test",         results: ["Negative","Positive — laxity","Painful"],    outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-quad-ten",  label: "Palpation — Quadriceps tendon",   results: ["Nil tenderness","Mild tenderness","Moderate tenderness"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-it-band",   label: "Palpation — IT band region",      results: ["Nil tenderness","Mild tenderness","TrP present"],         outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-popliteal", label: "Palpation — Popliteal region",    results: ["Nil tenderness","Mild tenderness","Guarding"],            outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Elbow & Forearm": {
    "Movement / ROM": [
      { id: "arom-flex",  label: "AROM — Elbow flexion",   results: ["Full ROM","Reduced ROM","Painful","Pain at end range"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-ext",   label: "AROM — Elbow extension", results: ["Full ROM","Reduced ROM","Painful","Pain at end range"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-pro",   label: "AROM — Pronation",       results: ["Full ROM","Reduced ROM","Painful"],                     outcomes: ["Improved","No change","Aggravated"] },
      { id: "arom-sup",   label: "AROM — Supination",      results: ["Full ROM","Reduced ROM","Painful"],                     outcomes: ["Improved","No change","Aggravated"] },
      { id: "wrist-ext",  label: "Wrist extension (resisted)", results: ["Strong and painless","Weak and painless","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "wrist-flex", label: "Wrist flexion (resisted)",   results: ["Strong and painless","Weak and painless","Painful"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "humeroulnar-play", label: "Joint play — Humeroulnar", results: ["Normal","Restricted","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "radial-play",      label: "Joint play — Radial head", results: ["Normal","Restricted","Painful"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-lat-epic",   label: "Palpation — Lateral epicondyle", results: ["Nil tenderness","Mild tenderness","Moderate tenderness"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-med-epic",   label: "Palpation — Medial epicondyle",  results: ["Nil tenderness","Mild tenderness","Moderate tenderness"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-ext-group",  label: "Palpation — Extensor group",     results: ["Nil tenderness","Mild tenderness","TrP present"],         outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Wrist & Hand": {
    "Movement / ROM": [
      { id: "wrist-flex",  label: "Wrist flexion",   results: ["Full ROM","Reduced ROM","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "wrist-ext",   label: "Wrist extension", results: ["Full ROM","Reduced ROM","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "grip",        label: "Grip strength",   results: ["Normal","Reduced","Painful on grip"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "radiocarpal-play", label: "Joint play — Radiocarpal", results: ["Normal","Restricted","Painful"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-thenar",      label: "Palpation — Thenar region",     results: ["Nil tenderness","Mild tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-forearm-flex",label: "Palpation — Forearm flexors",   results: ["Nil tenderness","Mild tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Thigh": {
    "Movement / ROM": [
      { id: "slr",        label: "Straight leg raise (SLR)", results: ["Negative","Positive — neural","Positive — hamstring"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "length-ham", label: "Hamstring length",         results: ["Normal","Shortened","Reproduces symptoms"],           outcomes: ["Improved","No change","Aggravated"] },
      { id: "length-quad",label: "Quadriceps length",        results: ["Normal","Shortened","Reproduces symptoms"],           outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [],
    "Tissue": [
      { id: "palp-quads",  label: "Palpation — Quadriceps group", results: ["Nil tenderness","Mild tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-hams",   label: "Palpation — Hamstring group",  results: ["Nil tenderness","Mild tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-itband", label: "Palpation — IT band",          results: ["Nil tenderness","Mild tenderness","Taut band"],   outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Lower Leg & Calf": {
    "Movement / ROM": [
      { id: "dorsiflexion",   label: "Dorsiflexion",   results: ["Full ROM","Reduced ROM","Painful"],                 outcomes: ["Improved","No change","Aggravated"] },
      { id: "length-gastroc", label: "Gastroc length", results: ["Normal","Shortened","Reproduces symptoms"],         outcomes: ["Improved","No change","Aggravated"] },
      { id: "length-soleus",  label: "Soleus length",  results: ["Normal","Shortened","Reproduces symptoms"],         outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "prox-tibfib", label: "Joint play — Proximal tib-fib", results: ["Normal","Restricted","Painful"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-gastroc",  label: "Palpation — Gastrocnemius", results: ["Nil tenderness","Mild tenderness","TrP present"],      outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-soleus",   label: "Palpation — Soleus",        results: ["Nil tenderness","Mild tenderness","TrP present"],      outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-achilles", label: "Palpation — Achilles",      results: ["Nil tenderness","Mild tenderness","Thickening noted"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
  "Ankle & Foot": {
    "Movement / ROM": [
      { id: "dorsiflex",   label: "Dorsiflexion",   results: ["Full ROM","Reduced ROM","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "plantarflex", label: "Plantarflexion", results: ["Full ROM","Reduced ROM","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "inversion",   label: "Inversion",      results: ["Full ROM","Reduced ROM","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "eversion",    label: "Eversion",       results: ["Full ROM","Reduced ROM","Painful"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Joint / Structure": [
      { id: "talocrural", label: "Joint play — Talocrural", results: ["Normal","Restricted","Painful"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "subtalar",   label: "Joint play — Subtalar",   results: ["Normal","Restricted","Painful"], outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Tissue": [
      { id: "palp-plantar",  label: "Palpation — Plantar fascia",   results: ["Nil tenderness","Mild tenderness","Moderate tenderness"], outcomes: ["Improved","No change","Aggravated"] },
      { id: "palp-achilles", label: "Palpation — Achilles tendon",  results: ["Nil tenderness","Mild tenderness","Thickening"],          outcomes: ["Improved","No change","Aggravated"] },
    ],
    "Symptoms": GLOBAL_SYMPTOM_TESTS,
  },
};

const FALLBACK_OBJECTIVE = {
  "Movement / ROM":    [{ id: "arom-generic",  label: "AROM — Functional movement", results: ["Full ROM","Reduced ROM","Painful","Compensated"],                   outcomes: ["Improved","No change","Aggravated"] }],
  "Joint / Structure": [{ id: "joint-generic", label: "Joint play",                 results: ["Normal","Restricted","Painful"],                                    outcomes: ["Improved","No change","Aggravated"] }],
  "Tissue":            [{ id: "palp-generic",  label: "Palpation",                  results: ["Nil tenderness","Mild tenderness","Moderate tenderness","TrP present"], outcomes: ["Improved","No change","Aggravated"] }],
  "Symptoms": GLOBAL_SYMPTOM_TESTS,
};

const SPECIAL_TESTS_BY_REGION = {
  "Cranial":          ["TMJ load test","Chvostek's sign"],
  "Cervical":         ["Spurling's test","Cervical distraction test","ULTT (Median)","ULTT (Radial)","ULTT (Ulnar)","Shoulder abduction relief test","Sharp-Purser test","Vertebral artery test"],
  "Thoracic":         ["Thoracic compression test","Passive thoracic extension","Rib spring test","Slump test (thoracic)"],
  "Shoulder":         ["Hawkins-Kennedy test","Neer's test","Empty Can test","Full Can test","Drop Arm test","Speed's test","Yergason's test","Apprehension test","O'Brien's test","Cross-body adduction test","Lift-Off test","AC joint compression test"],
  "Lumbar / Sacral":  ["Straight leg raise (SLR)","Slump test","Prone knee bend","Kemp's test","FABER test","Gaenslen's test","Sacral compression test","Thigh thrust test","Gillet's test"],
  "Hip":              ["Thomas test","Ober's test","Hip scour test","Trendelenburg test","FABER test","FADIR test"],
  "Knee":             ["McMurray's test","Lachman's test","Anterior drawer test","Posterior drawer test","Patella grind test","Thessaly test","Valgus stress test","Varus stress test"],
  "Elbow & Forearm":  ["Cozen's test","Mill's test","Medial epicondyle stress test","Valgus stress test","Varus stress test","Elbow flexion test","Tinel's sign at elbow"],
  "Wrist & Hand":     ["Phalen's test","Tinel's sign at wrist","Finkelstein's test","Watson's test","Carpal compression test","Allen's test"],
  "Thigh":            ["90-90 SLR","Ely's test","Rectus femoris length test"],
  "Lower Leg & Calf": ["Thompson test","Windlass test"],
  "Ankle & Foot":     ["Anterior drawer test (ankle)","Talar tilt test","Thompson test","Ottawa ankle rules assessment","Windlass test","Mulder's click test"],
};

const OBJECTIVE_MODE_TABS = ["Movement / ROM","Joint / Structure","Tissue","Symptoms","Special Tests"];
const TEST_RESULT_OPTIONS = ["+","−","N/T"];
const today = new Date().toISOString().split("T")[0];

// ─── Intake form contraindications ───────────────────────────────────────────

const CONTRAINDICATIONS = [
  "Deep vein thrombosis (DVT) / blood clots",
  "Active cancer / malignancy",
  "Acute inflammation or infection",
  "Open wounds or skin infections",
  "Recent fracture (unhealed)",
  "Severe osteoporosis",
  "Pregnancy (first trimester or high risk)",
  "Pacemaker or implanted device",
  "Recent surgery (within 6 weeks)",
  "Fever or acute illness",
  "Anticoagulant medication (blood thinners)",
  "Varicose veins (in affected area)",
  "Uncontrolled epilepsy",
  "Diabetes with peripheral neuropathy",
  "Haemophilia or bleeding disorder",
  "Hypermobility syndrome (EDS etc.)",
  "Acute disc herniation / nerve compression",
  "Severe hypertension (uncontrolled)",
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle = (color = C.muted) => ({
  display: "block", fontSize: "10px", fontWeight: "bold",
  letterSpacing: "0.08em", textTransform: "uppercase", color, marginBottom: "3px",
});

const inputStyle = {
  width: "100%", padding: "6px 8px",
  border: `1px solid ${C.border}`, borderRadius: "5px",
  background: C.cream, fontFamily: "inherit", fontSize: "12px",
  color: C.text, boxSizing: "border-box",
};

// ─── App bar ──────────────────────────────────────────────────────────────────

function AppBar({ title, subtitle, onBack, actions }) {
  return (
    <header style={{ padding: "9px 20px", background: C.maroon, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {onBack && (
          <button onClick={onBack}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "5px", color: C.white, cursor: "pointer", padding: "4px 10px", fontSize: "12px", fontFamily: "inherit" }}>
            ← Back
          </button>
        )}
        <div style={{ width: "28px", height: "28px", border: `2px solid ${C.gold}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: C.gold, fontWeight: "bold", flexShrink: 0 }}>E</div>
        <div>
          <div style={{ color: C.gold, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Eadig Manual Therapies</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>{subtitle || "Session Notes — Alpha 0.6"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {actions}
      </div>
    </header>
  );
}

// ─── Client List Screen ───────────────────────────────────────────────────────

function ClientListScreen({ clients, onSelectClient, onNewClient }) {
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.cream, overflow: "hidden" }}>
      <AppBar subtitle="Client Records — Alpha 0.6" actions={
        <button onClick={onNewClient}
          style={{ padding: "5px 14px", background: C.gold, color: C.maroon, border: "none", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: "bold" }}>
          + New Client
        </button>
      } />

      <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, fontSize: "13px", padding: "8px 12px" }}
          />
        </div>

        {clients.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, gap: "12px", paddingTop: "60px" }}>
            <div style={{ fontSize: "40px", opacity: 0.2 }}>👤</div>
            <div style={{ fontSize: "14px" }}>No clients yet</div>
            <button onClick={onNewClient}
              style={{ padding: "8px 20px", background: C.maroon, color: C.white, border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>
              Add your first client
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: C.muted, fontSize: "13px", textAlign: "center", paddingTop: "40px" }}>No clients match "{search}"</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {filtered.map(client => (
              <div key={client.id} onClick={() => onSelectClient(client.id)}
                style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.maroon}`, borderRadius: "8px", padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "14px", color: C.text }}>{client.name}</div>
                  <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>
                    {client.dob ? `DOB: ${client.dob}` : ""}
                    {client.dob && client.phone ? " · " : ""}
                    {client.phone || ""}
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: C.muted, textAlign: "right" }}>
                  {client.sessionCount > 0 ? (
                    <span style={{ background: C.creamDark, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "2px 8px" }}>
                      {client.sessionCount} session{client.sessionCount !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span style={{ color: C.border }}>No sessions yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Intake Form Screen ───────────────────────────────────────────────────────

const EMPTY_CLIENT = {
  id: null, name: "", dob: "", sex: "", phone: "", email: "", address: "",
  emergencyContact: "", emergencyPhone: "",
  medicalConditions: "", medications: "", allergies: "",
  previousSurgeries: "", previousInjuries: "",
  underMedicalCare: false, medicalCareDetails: "",
  previousMassage: false, massageFrequency: "",
  contraindications: [],
  pressurePreference: "", areasToAvoid: "", treatmentGoals: "",
  consentDate: today, createdAt: null,
};

// ─── Intake form helper (must be outside IntakeFormScreen to avoid remount) ──

function IntakeSection({ title, color = C.maroon, children }) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color, borderBottom: `1px solid ${C.border}`, paddingBottom: "6px", marginBottom: "12px" }}>{title}</div>
      {children}
    </div>
  );
}

function IntakeFormScreen({ client: initialClient, onSave, onCancel }) {
  const [form, setForm] = useState(initialClient || EMPTY_CLIENT);
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const isNew = !form.id;

  const toggleContraindication = (item) => {
    const current = form.contraindications ?? [];
    set("contraindications", current.includes(item) ? current.filter(x => x !== item) : [...current, item]);
  };

  const handleSave = () => {
    if (!form.name.trim()) { alert("Client name is required."); return; }
    onSave({ ...form, id: form.id || genId(), createdAt: form.createdAt || today });
  };

  const iStyle = { ...inputStyle };
  const taStyle = { ...inputStyle, resize: "vertical", lineHeight: "1.5" };
  const fieldWrap = { marginBottom: "10px" };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.cream, overflow: "hidden", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <AppBar
        subtitle={isNew ? "New Client — Intake Form" : `Edit — ${form.name}`}
        onBack={onCancel}
        actions={
          <button onClick={handleSave}
            style={{ padding: "5px 14px", background: C.gold, color: C.maroon, border: "none", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: "bold" }}>
            {isNew ? "Save Client" : "Update Client"}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "24px", maxWidth: "680px", margin: "0 auto", width: "100%" }}>

        <IntakeSection title="Personal Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1 / -1", marginBottom: "10px" }}>
              <label style={labelStyle()}>Full name *</label>
              <input type="text" value={form.name} placeholder="Full legal name"
                onChange={e => set("name", e.target.value)}
                style={{ ...iStyle, fontWeight: "bold", fontSize: "13px" }} />
            </div>
            <div style={fieldWrap}><label style={labelStyle()}>Date of birth</label><input type="date" value={form.dob ?? ""} onChange={e => set("dob", e.target.value)} style={iStyle} /></div>
            <div style={fieldWrap}>
              <label style={labelStyle()}>Sex</label>
              <select value={form.sex ?? ""} onChange={e => set("sex", e.target.value)} style={iStyle}>
                <option value="">— select —</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </div>
            <div style={fieldWrap}><label style={labelStyle()}>Phone</label><input type="tel" value={form.phone ?? ""} placeholder="0400 000 000" onChange={e => set("phone", e.target.value)} style={iStyle} /></div>
            <div style={fieldWrap}><label style={labelStyle()}>Email</label><input type="email" value={form.email ?? ""} placeholder="name@email.com" onChange={e => set("email", e.target.value)} style={iStyle} /></div>
            <div style={{ gridColumn: "1 / -1", ...fieldWrap }}><label style={labelStyle()}>Address</label><textarea rows={2} value={form.address ?? ""} placeholder="Street address, suburb, state, postcode" onChange={e => set("address", e.target.value)} style={taStyle} /></div>
            <div style={fieldWrap}><label style={labelStyle()}>Emergency contact name</label><input type="text" value={form.emergencyContact ?? ""} placeholder="Full name" onChange={e => set("emergencyContact", e.target.value)} style={iStyle} /></div>
            <div style={fieldWrap}><label style={labelStyle()}>Emergency contact phone</label><input type="tel" value={form.emergencyPhone ?? ""} placeholder="0400 000 000" onChange={e => set("emergencyPhone", e.target.value)} style={iStyle} /></div>
          </div>
        </IntakeSection>

        <IntakeSection title="Medical History" color={C.S}>
          <div style={fieldWrap}><label style={labelStyle()}>Current medical conditions</label><textarea rows={2} value={form.medicalConditions ?? ""} placeholder="List any diagnosed conditions, e.g. hypertension, diabetes, arthritis…" onChange={e => set("medicalConditions", e.target.value)} style={taStyle} /></div>
          <div style={fieldWrap}><label style={labelStyle()}>Current medications</label><textarea rows={2} value={form.medications ?? ""} placeholder="Include name and purpose if known…" onChange={e => set("medications", e.target.value)} style={taStyle} /></div>
          <div style={fieldWrap}><label style={labelStyle()}>Allergies</label><textarea rows={1} value={form.allergies ?? ""} placeholder="Especially to oils, lotions, latex…" onChange={e => set("allergies", e.target.value)} style={taStyle} /></div>
          <div style={fieldWrap}><label style={labelStyle()}>Previous surgeries</label><textarea rows={2} value={form.previousSurgeries ?? ""} placeholder="Type and approximate year…" onChange={e => set("previousSurgeries", e.target.value)} style={taStyle} /></div>
          <div style={fieldWrap}><label style={labelStyle()}>Previous injuries</label><textarea rows={2} value={form.previousInjuries ?? ""} placeholder="Fractures, sprains, significant trauma…" onChange={e => set("previousInjuries", e.target.value)} style={taStyle} /></div>

          <div style={{ display: "flex", gap: "16px", marginBottom: "10px", flexWrap: "wrap" }}>
            <div>
              <label style={labelStyle()}>Currently under medical care?</label>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                {["Yes","No"].map(opt => (
                  <button key={opt} onClick={() => set("underMedicalCare", opt === "Yes")}
                    style={{ padding: "4px 14px", border: `1px solid ${form.underMedicalCare === (opt === "Yes") ? C.S : C.border}`, borderRadius: "10px", background: form.underMedicalCare === (opt === "Yes") ? C.S : C.cream, color: form.underMedicalCare === (opt === "Yes") ? C.white : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle()}>Previous massage therapy?</label>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                {["Yes","No"].map(opt => (
                  <button key={opt} onClick={() => set("previousMassage", opt === "Yes")}
                    style={{ padding: "4px 14px", border: `1px solid ${form.previousMassage === (opt === "Yes") ? C.S : C.border}`, borderRadius: "10px", background: form.previousMassage === (opt === "Yes") ? C.S : C.cream, color: form.previousMassage === (opt === "Yes") ? C.white : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {form.underMedicalCare && <div style={fieldWrap}><label style={labelStyle()}>Medical care details</label><textarea rows={1} value={form.medicalCareDetails ?? ""} placeholder="Practitioner name / reason…" onChange={e => set("medicalCareDetails", e.target.value)} style={taStyle} /></div>}
          {form.previousMassage && <div style={fieldWrap}><label style={labelStyle()}>Massage frequency</label><input type="text" value={form.massageFrequency ?? ""} placeholder="e.g. Monthly, rarely, as needed…" onChange={e => set("massageFrequency", e.target.value)} style={iStyle} /></div>}
        </IntakeSection>

        <IntakeSection title="Contraindications & Precautions" color="#C62828">
          <div style={{ fontSize: "11px", color: C.muted, marginBottom: "10px", fontStyle: "italic" }}>
            Tick any that apply. These will be visible at the top of each session.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {CONTRAINDICATIONS.map(item => {
              const checked = (form.contraindications ?? []).includes(item);
              return (
                <div key={item} onClick={() => toggleContraindication(item)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", background: checked ? "#FEF2F2" : C.white, border: `1px solid ${checked ? "#FECACA" : C.border}`, borderRadius: "6px", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ width: "16px", height: "16px", border: `2px solid ${checked ? "#C62828" : C.border}`, borderRadius: "3px", background: checked ? "#C62828" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {checked && <span style={{ color: C.white, fontSize: "10px", fontWeight: "bold" }}>✓</span>}
                  </div>
                  <span style={{ fontSize: "12px", color: checked ? "#C62828" : C.text }}>{item}</span>
                </div>
              );
            })}
          </div>
        </IntakeSection>

        <IntakeSection title="Treatment Preferences" color={C.P}>
          <div style={{ marginBottom: "10px" }}>
            <label style={labelStyle()}>Pressure preference</label>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
              {["Light","Light–medium","Medium","Medium–firm","Firm"].map(opt => (
                <button key={opt} onClick={() => set("pressurePreference", opt)}
                  style={{ padding: "4px 12px", border: `1px solid ${form.pressurePreference === opt ? C.P : C.border}`, borderRadius: "10px", background: form.pressurePreference === opt ? C.P : C.cream, color: form.pressurePreference === opt ? C.white : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div style={fieldWrap}><label style={labelStyle()}>Areas to avoid</label><textarea rows={1} value={form.areasToAvoid ?? ""} placeholder="e.g. Left shoulder, abdomen…" onChange={e => set("areasToAvoid", e.target.value)} style={taStyle} /></div>
          <div style={fieldWrap}><label style={labelStyle()}>Treatment goals</label><textarea rows={2} value={form.treatmentGoals ?? ""} placeholder="What does the client hope to achieve from treatment?" onChange={e => set("treatmentGoals", e.target.value)} style={taStyle} /></div>
        </IntakeSection>

        <IntakeSection title="Consent" color={C.O}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px", fontSize: "11px", color: C.muted, lineHeight: "1.7", marginBottom: "10px" }}>
            I consent to remedial massage treatment and confirm that the information provided above is accurate to the best of my knowledge. I understand that massage therapy is not a substitute for medical diagnosis or treatment.
          </div>
          <div style={fieldWrap}><label style={labelStyle()}>Consent date</label><input type="date" value={form.consentDate ?? ""} onChange={e => set("consentDate", e.target.value)} style={iStyle} /></div>
        </IntakeSection>

      </div>
    </div>
  );
}

// ─── Client Profile Screen ────────────────────────────────────────────────────

function ClientProfileScreen({ client, sessions, onNewSession, onOpenSession, onEditClient, onBack }) {
  const clientSessions = sessions
    .filter(s => s.clientId === client.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const hasContraindications = (client.contraindications ?? []).length > 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.cream, overflow: "hidden", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <AppBar
        subtitle={`${client.name} — Profile`}
        onBack={onBack}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onEditClient}
              style={{ padding: "5px 12px", background: "rgba(255,255,255,0.15)", color: C.white, border: "1px solid rgba(255,255,255,0.3)", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}>
              Edit intake
            </button>
            <button onClick={onNewSession}
              style={{ padding: "5px 14px", background: C.gold, color: C.maroon, border: "none", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: "bold" }}>
              + New Session
            </button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "720px", margin: "0 auto", width: "100%" }}>

        {/* Contraindications banner */}
        {hasContraindications && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#C62828", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              ⚠ Contraindications / Precautions on file
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {client.contraindications.map(c => (
                <span key={c} style={{ background: "#FEE2E2", color: "#C62828", border: "1px solid #FECACA", borderRadius: "8px", padding: "2px 8px", fontSize: "11px" }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Client summary */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
          {[
            ["Date of birth", client.dob],
            ["Phone", client.phone],
            ["Email", client.email],
            ["Pressure preference", client.pressurePreference],
            ["Treatment goals", client.treatmentGoals],
            ["Areas to avoid", client.areasToAvoid],
            ["Medications", client.medications],
            ["Allergies", client.allergies],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>{label}</div>
              <div style={{ fontSize: "12px", color: C.text }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Session history */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.maroon, borderBottom: `1px solid ${C.border}`, paddingBottom: "6px", marginBottom: "10px" }}>
            Session History ({clientSessions.length})
          </div>

          {clientSessions.length === 0 ? (
            <div style={{ color: C.muted, fontSize: "13px", textAlign: "center", padding: "30px", background: C.white, borderRadius: "8px", border: `1px solid ${C.border}` }}>
              No sessions yet.
              <div style={{ marginTop: "10px" }}>
                <button onClick={onNewSession}
                  style={{ padding: "7px 18px", background: C.maroon, color: C.white, border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>
                  Start first session
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {clientSessions.map((session, idx) => {
                const date = session.date ? new Date(session.date).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                const complaint = [session.subjective?.modifiers?.join(" "), session.subjective?.region].filter(Boolean).join(" · ");
                return (
                  <div key={session.id} onClick={() => onOpenSession(session.id)}
                    style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.maroon}`, borderRadius: "8px", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "13px", color: C.text }}>
                        Session {session.sessionNumber || clientSessions.length - idx}
                        <span style={{ fontWeight: "normal", color: C.muted, marginLeft: "8px" }}>{date}</span>
                      </div>
                      {complaint && <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{complaint}</div>}
                    </div>
                    <div style={{ fontSize: "11px", color: C.muted }}>
                      {session.updatedAt ? `Saved ${session.updatedAt}` : "Draft"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function ModifierChips({ groups, selected, onChange, accentColor }) {
  const color = accentColor || C.S;
  const toggle = (m) => selected.includes(m) ? onChange(selected.filter(x => x !== m)) : onChange([...selected, m]);
  if (!groups || groups.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: "0", alignItems: "flex-start", flexWrap: "wrap" }}>
      {groups.map(({ plane, terms }, i) => (
        <div key={plane} style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: i > 0 ? "10px" : 0, marginLeft: i > 0 ? "10px" : 0, borderLeft: i > 0 ? `1px dashed ${C.border}` : "none" }}>
          <span style={{ fontSize: "9px", fontWeight: "bold", letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted }}>{plane}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {terms.map(m => {
              const sel = selected.includes(m);
              return (
                <button key={m} onClick={() => toggle(m)}
                  style={{ padding: "3px 11px", border: `1px solid ${sel ? color : C.border}`, borderRadius: "12px", background: sel ? color : C.cream, color: sel ? C.white : C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: sel ? "bold" : "normal", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModifierPicker({ region, selected, onChange, accentColor }) {
  const groups = REGION_MODIFIERS[region] ?? [];
  if (groups.length === 0) return null;
  return <ModifierChips groups={groups} selected={selected} onChange={onChange} accentColor={accentColor} />;
}

function RegionHeading({ label, color }) {
  return (
    <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase", color, borderBottom: `1px solid ${C.border}`, paddingBottom: "4px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ width: "20px", height: "1px", background: color, display: "inline-block", flexShrink: 0 }} />
      {label}
      <span style={{ flex: 1, height: "1px", background: C.border, display: "inline-block" }} />
    </div>
  );
}

function TechniquePicker({ options, selected, onChange, accentColor }) {
  const [open, setOpen] = useState(false);
  const color = accentColor || C.O;
  const toggle = (opt) => selected.includes(opt) ? onChange(selected.filter(o => o !== opt)) : onChange([...selected, opt]);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", minHeight: "34px", flexWrap: "wrap", gap: "4px", padding: "4px 8px" }}>
        {selected.length === 0 ? <span style={{ color: C.muted }}>— select techniques —</span>
          : selected.map(s => <span key={s} style={{ background: color, color: C.white, borderRadius: "10px", padding: "2px 8px", fontSize: "11px" }}>{s}</span>)}
        <span style={{ color: C.muted, fontSize: "10px", marginLeft: "auto", flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 100, top: "100%", left: 0, right: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", maxHeight: "220px", overflowY: "auto" }}>
          {options.map(opt => (
            <div key={opt} onClick={() => toggle(opt)} style={{ padding: "7px 12px", fontSize: "12px", cursor: "pointer", background: selected.includes(opt) ? `${color}18` : "transparent", color: selected.includes(opt) ? color : C.text, display: "flex", alignItems: "center", gap: "8px", borderBottom: `1px solid ${C.creamDark}` }}>
              <span style={{ width: "14px", height: "14px", border: `1px solid ${selected.includes(opt) ? color : C.border}`, borderRadius: "3px", background: selected.includes(opt) ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: C.white, flexShrink: 0 }}>
                {selected.includes(opt) ? "✓" : ""}
              </span>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── S Tab ────────────────────────────────────────────────────────────────────

function SubjectiveTab({ data, onChange }) {
  const set = (field, value) => onChange({ ...data, [field]: value });

  const isRowFilled = (field) => {
    if (field.type === "site") return !!(data.region || data.modifiers?.length > 0);
    if (field.type === "double") return field.fields.some(f => data[f.key]);
    if (field.type === "multiDouble") return field.fields.some(f => (data[f.key] ?? []).length > 0);
    return !!data[field.key];
  };

  const summary = [
    data.modifiers?.length > 0 ? data.modifiers.join(" ") : null,
    data.region || null,
    data.character || null,
    data.onset ? data.onset.split(" — ")[0].toLowerCase() : null,
    data.severityWorst ? `${data.severityWorst}/10 at worst` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
      {summary && (
        <div style={{ background: "#FDF2EC", border: `1px solid ${C.S}`, borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: C.S }}>
          <span style={{ fontWeight: "bold", marginRight: "6px" }}>S —</span>{summary}
        </div>
      )}
      {SOCRATES_FIELDS.map((field) => {
        const filled = isRowFilled(field);
        return (
          <div key={field.key} style={{ padding: "7px 12px", background: C.white, border: `1px solid ${filled ? C.S : C.border}`, borderLeft: `4px solid ${filled ? C.S : C.border}`, borderRadius: "6px", transition: "all 0.15s" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: filled ? C.S : C.creamDark, color: filled ? C.white : C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", flexShrink: 0, transition: "all 0.2s" }}>{field.letter}</div>
              <div style={{ width: "130px", flexShrink: 0, fontSize: "12px", fontWeight: "bold", color: filled ? C.S : C.muted }}>{field.label}</div>

              {field.type === "site" ? (
                <div style={{ flex: 1 }}>
                  <select value={data.region ?? ""} onChange={e => onChange({ ...data, region: e.target.value, modifiers: [] })} style={inputStyle}>
                    <option value="">— select region —</option>
                    {field.regionField.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ) : field.type === "single" ? (
                <select value={data[field.key] ?? ""} onChange={e => set(field.key, e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  <option value="">— select —</option>
                  {field.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : field.type === "multiDouble" ? (
                <div style={{ flex: 1, display: "flex", gap: "12px" }}>
                  {field.fields.map(f => {
                    const selected = data[f.key] ?? [];
                    const toggle = (opt) => set(f.key, selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
                    return (
                      <div key={f.key} style={{ flex: 1 }}>
                        <label style={labelStyle()}>{f.label}</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                          {f.options.map(opt => {
                            const sel = selected.includes(opt);
                            return (
                              <button key={opt} onClick={() => toggle(opt)}
                                style={{ padding: "3px 10px", border: `1px solid ${sel ? C.S : C.border}`, borderRadius: "12px", background: sel ? C.S : C.cream, color: sel ? C.white : C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: sel ? "bold" : "normal", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", gap: "8px" }}>
                  {field.fields.map(f => (
                    <div key={f.key} style={{ flex: 1 }}>
                      <label style={labelStyle()}>{f.label}</label>
                      <select value={data[f.key] ?? ""} onChange={e => set(f.key, e.target.value)} style={inputStyle}>
                        <option value="">— select —</option>
                        {f.options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {field.type === "site" && (
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${C.creamDark}` }}>
                <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: "6px" }}>Localisation</div>
                {REGION_MODIFIERS[data.region] ? (
                  <ModifierChips groups={REGION_MODIFIERS[data.region]} selected={data.modifiers ?? []} onChange={val => onChange({ ...data, modifiers: val })} accentColor={C.S} />
                ) : (
                  <div style={{ fontSize: "11px", color: C.muted, fontStyle: "italic" }}>
                    {data.region ? "No localisation available for this region." : "Select a region to see localisation options."}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ padding: "10px 12px", background: C.white, border: `1px solid ${data.narrative ? C.S : C.border}`, borderLeft: `4px solid ${data.narrative ? C.S : C.border}`, borderRadius: "6px", transition: "all 0.15s" }}>
        <label style={labelStyle(data.narrative ? C.S : C.muted)}>Patient story — in their own words</label>
        <textarea rows={4} placeholder="Tell the story of the complaint — how it started, how it's changed, what the patient says about it in their own words…"
          value={data.narrative ?? ""} onChange={e => set("narrative", e.target.value)}
          style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }} />
      </div>
    </div>
  );
}

// ─── Body Map ─────────────────────────────────────────────────────────────────

// SVG coordinate space: 100 wide × 260 tall
// Zones are [id, label, x, y, w, h, layer-hint]
// x,y = top-left corner of hit zone

const BODY_ZONES = [
  // Head
  { id: "cranial",        label: "Cranial",              x: 38, y: 2,   w: 24, h: 18 },
  // Neck
  { id: "cervical",       label: "Cervical",             x: 42, y: 20,  w: 16, h: 12 },
  // Shoulders
  { id: "shoulder-l",     label: "Shoulder (L)",         x: 20, y: 30,  w: 18, h: 16 },
  { id: "shoulder-r",     label: "Shoulder (R)",         x: 62, y: 30,  w: 18, h: 16 },
  // Thoracic
  { id: "thoracic",       label: "Thoracic",             x: 38, y: 32,  w: 24, h: 22 },
  // Upper arms
  { id: "upper-arm-l",    label: "Upper arm (L)",        x: 18, y: 46,  w: 14, h: 18 },
  { id: "upper-arm-r",    label: "Upper arm (R)",        x: 68, y: 46,  w: 14, h: 18 },
  // Elbows
  { id: "elbow-l",        label: "Elbow & Forearm (L)",  x: 14, y: 64,  w: 14, h: 20 },
  { id: "elbow-r",        label: "Elbow & Forearm (R)",  x: 72, y: 64,  w: 14, h: 20 },
  // Lumbar/sacral
  { id: "lumbar",         label: "Lumbar / Sacral",      x: 38, y: 54,  w: 24, h: 22 },
  // Wrists/hands
  { id: "wrist-l",        label: "Wrist & Hand (L)",     x: 10, y: 84,  w: 14, h: 20 },
  { id: "wrist-r",        label: "Wrist & Hand (R)",     x: 76, y: 84,  w: 14, h: 20 },
  // Hips
  { id: "hip-l",          label: "Hip (L)",              x: 32, y: 76,  w: 16, h: 18 },
  { id: "hip-r",          label: "Hip (R)",              x: 52, y: 76,  w: 16, h: 18 },
  // Thighs
  { id: "thigh-l",        label: "Thigh (L)",            x: 33, y: 94,  w: 14, h: 26 },
  { id: "thigh-r",        label: "Thigh (R)",            x: 53, y: 94,  w: 14, h: 26 },
  // Knees
  { id: "knee-l",         label: "Knee (L)",             x: 33, y: 120, w: 14, h: 14 },
  { id: "knee-r",         label: "Knee (R)",             x: 53, y: 120, w: 14, h: 14 },
  // Lower legs
  { id: "lower-leg-l",    label: "Lower Leg & Calf (L)", x: 33, y: 134, w: 13, h: 26 },
  { id: "lower-leg-r",    label: "Lower Leg & Calf (R)", x: 54, y: 134, w: 13, h: 26 },
  // Ankles/feet
  { id: "ankle-l",        label: "Ankle & Foot (L)",     x: 30, y: 160, w: 16, h: 14 },
  { id: "ankle-r",        label: "Ankle & Foot (R)",     x: 54, y: 160, w: 16, h: 14 },
];

const LAYER_COLORS = { S: C.S, O: C.O };
const LAYER_LABELS = { S: "Subjective", O: "Objective" };

function FigureSVG({ annotations, onZoneClick, activeLayer, scale = 1 }) {
  const W = 100 * scale;
  const H = 180 * scale;
  const s = scale;

  // Count annotations per zone for marker display
  const annotationsByZone = (annotations ?? []).reduce((acc, a) => {
    if (!acc[a.zoneId]) acc[a.zoneId] = [];
    acc[a.zoneId].push(a);
    return acc;
  }, {});

  return (
    <svg viewBox="0 0 100 180" width={W} height={H} style={{ display: "block" }}>
      {/* Body outline — simplified front figure */}
      {/* Head */}
      <ellipse cx="50" cy="10" rx="11" ry="9" fill="#F0E8D8" stroke="#C9973A" strokeWidth="0.8" />
      {/* Neck */}
      <rect x="45" y="19" width="10" height="8" rx="2" fill="#F0E8D8" stroke="#C9973A" strokeWidth="0.8" />
      {/* Torso */}
      <path d="M32 27 Q28 28 22 32 L18 80 Q28 84 50 84 Q72 84 82 80 L78 32 Q72 28 68 27 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Left arm */}
      <path d="M22 32 Q16 38 14 50 L12 72 Q16 74 20 72 L22 50 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Left forearm */}
      <path d="M12 72 Q10 80 10 90 L14 92 Q17 82 20 72 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Left hand */}
      <ellipse cx="12" cy="96" rx="5" ry="7" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Right arm */}
      <path d="M78 32 Q84 38 86 50 L88 72 Q84 74 80 72 L78 50 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Right forearm */}
      <path d="M88 72 Q90 80 90 90 L86 92 Q83 82 80 72 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Right hand */}
      <ellipse cx="88" cy="96" rx="5" ry="7" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Left leg */}
      <path d="M36 84 L32 134 Q34 136 40 136 L44 84 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Right leg */}
      <path d="M56 84 L56 136 Q62 136 64 134 L68 84 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Left calf */}
      <path d="M32 134 Q31 152 32 162 L40 162 L40 136 Q34 136 32 134 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Right calf */}
      <path d="M60 136 L60 162 L68 162 Q69 152 68 134 Q66 136 60 136 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Left foot */}
      <path d="M30 162 Q28 168 30 172 L42 172 L40 162 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />
      {/* Right foot */}
      <path d="M60 162 L58 172 L70 172 Q72 168 70 162 Z" fill="#FAF6EF" stroke="#C9973A" strokeWidth="0.8" />

      {/* Clickable zones — transparent overlays */}
      {BODY_ZONES.map(zone => {
        const zoneAnnotations = annotationsByZone[zone.id] ?? [];
        return (
          <g key={zone.id} onClick={() => onZoneClick && onZoneClick(zone)}
            style={{ cursor: onZoneClick ? "pointer" : "default" }}>
            <rect
              x={zone.x} y={zone.y} width={zone.w} height={zone.h}
              rx="3" fill="transparent"
              stroke={zoneAnnotations.length > 0 ? "rgba(107,31,42,0.3)" : "transparent"}
              strokeWidth="0.5"
              style={{ transition: "all 0.15s" }}
              onMouseEnter={e => { e.target.setAttribute("fill", "rgba(201,151,58,0.15)"); }}
              onMouseLeave={e => { e.target.setAttribute("fill", "transparent"); }}
            />
            {/* Annotation markers */}
            {zoneAnnotations.map((ann, i) => {
              const cx = zone.x + zone.w / 2 + (i - (zoneAnnotations.length - 1) / 2) * 6;
              const cy = zone.y + 4;
              return (
                <g key={ann.id}>
                  <circle cx={cx} cy={cy} r="4" fill={LAYER_COLORS[ann.layer] ?? C.maroon} />
                  <text x={cx} y={cy + 1.5} textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">{ann.number}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function BodyMapWidget({ annotations, onUpdate, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [activeLayer, setActiveLayer] = useState("S");
  const [selectedZone, setSelectedZone] = useState(null);
  const [noteText, setNoteText] = useState("");

  const anns = annotations ?? [];

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    setNoteText("");
  };

  const addAnnotation = () => {
    if (!selectedZone) return;
    const number = anns.length + 1;
    const newAnn = {
      id: genId(),
      zoneId: selectedZone.id,
      zoneLabel: selectedZone.label,
      layer: activeLayer,
      number,
      note: noteText,
    };
    onUpdate([...anns, newAnn]);
    setSelectedZone(null);
    setNoteText("");
  };

  const removeAnnotation = (id) => {
    const updated = anns.filter(a => a.id !== id);
    // Renumber
    const renumbered = updated.map((a, i) => ({ ...a, number: i + 1 }));
    onUpdate(renumbered);
  };

  if (compact && !expanded) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <FigureSVG annotations={anns} scale={1.6} />
          {anns.length > 0 && (
            <div style={{ fontSize: "10px", color: C.muted, textAlign: "center" }}>
              {anns.length} annotation{anns.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(true)}
          style={{ padding: "4px", background: C.O, color: C.white, border: "none", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", letterSpacing: "0.04em" }}>
          Annotate ↗
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.white, borderRadius: "10px", padding: "20px", maxWidth: "700px", width: "95%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", gap: "14px", fontFamily: "'Georgia', serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: "bold", fontSize: "14px", color: C.maroon }}>Body Map</div>
          <button onClick={() => setExpanded(false)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: C.muted, lineHeight: 1 }}>×</button>
        </div>

        {/* Layer selector */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: C.muted }}>Layer:</span>
          {Object.entries(LAYER_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => setActiveLayer(key)}
              style={{ padding: "4px 14px", border: `1px solid ${activeLayer === key ? LAYER_COLORS[key] : C.border}`, borderRadius: "10px", background: activeLayer === key ? LAYER_COLORS[key] : C.cream, color: activeLayer === key ? C.white : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: activeLayer === key ? "bold" : "normal" }}>
              {key} — {label}
            </button>
          ))}
          <span style={{ fontSize: "10px", color: C.muted, fontStyle: "italic", marginLeft: "4px" }}>Click a zone on the figure to add an annotation</span>
        </div>

        <div style={{ display: "flex", gap: "16px", flex: 1, overflow: "hidden" }}>

          {/* Figure */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <FigureSVG annotations={anns} onZoneClick={handleZoneClick} activeLayer={activeLayer} scale={2.2} />
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>

            {/* Add annotation panel */}
            {selectedZone ? (
              <div style={{ background: `${LAYER_COLORS[activeLayer]}10`, border: `1px solid ${LAYER_COLORS[activeLayer]}`, borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                <div style={{ fontWeight: "bold", fontSize: "12px", color: LAYER_COLORS[activeLayer] }}>
                  {activeLayer} — {selectedZone.label}
                </div>
                <textarea rows={2}
                  placeholder={activeLayer === "S" ? "Describe the symptom — e.g. sharp pain on movement…" : "Describe the finding — e.g. restricted ROM, tender on palpation…"}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  style={{ ...inputStyle, resize: "none", lineHeight: "1.5" }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addAnnotation}
                    style={{ flex: 1, padding: "7px", background: LAYER_COLORS[activeLayer], color: C.white, border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: "bold" }}>
                    + Add annotation #{anns.length + 1}
                  </button>
                  <button onClick={() => setSelectedZone(null)}
                    style={{ padding: "7px 12px", background: C.creamDark, color: C.muted, border: `1px solid ${C.border}`, borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "10px 12px", fontSize: "11px", color: C.muted, fontStyle: "italic", flexShrink: 0 }}>
                Click any zone on the figure to add a {activeLayer === "S" ? "symptom" : "finding"} annotation.
              </div>
            )}

            {/* Annotation list */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {anns.length === 0 ? (
                <div style={{ fontSize: "12px", color: C.muted, textAlign: "center", paddingTop: "20px" }}>No annotations yet.</div>
              ) : (
                anns.map(ann => (
                  <div key={ann.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 10px", background: C.white, border: `1px solid ${C.border}`, borderLeft: `3px solid ${LAYER_COLORS[ann.layer] ?? C.muted}`, borderRadius: "6px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: LAYER_COLORS[ann.layer] ?? C.muted, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", flexShrink: 0 }}>{ann.number}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: LAYER_COLORS[ann.layer] ?? C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{ann.layer} — {ann.zoneLabel}</div>
                      {ann.note && <div style={{ fontSize: "11px", color: C.text, marginTop: "2px" }}>{ann.note}</div>}
                    </div>
                    <button onClick={() => removeAnnotation(ann.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "16px", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── O Tab ────────────────────────────────────────────────────────────────────

function ObjectiveTab({ findings, onUpdateFinding, specialTests, onUpdateSpecialTests, bodyAnnotations, onUpdateBodyAnnotations }) {
  const [selectedRegion, setSelectedRegion] = useState("Shoulder");
  const [activeMode, setActiveMode] = useState("Movement / ROM");
  const [selectedTestId, setSelectedTestId] = useState(null);

  const regionConfig = OBJECTIVE_CONFIG[selectedRegion] ?? FALLBACK_OBJECTIVE;
  const tests = activeMode !== "Special Tests" ? (regionConfig[activeMode] ?? []) : [];
  const resolvedTestId = selectedTestId ?? tests[0]?.id ?? null;
  const selectedTest = tests.find(t => t.id === resolvedTestId) ?? tests[0] ?? null;
  const entryKey = selectedTest ? `${selectedRegion}::${selectedTest.id}` : "";
  const currentFinding = findings[entryKey] ?? { modifiers: [] };

  const changeRegion = (r) => { setSelectedRegion(r); setSelectedTestId(null); };
  const changeMode = (m) => { setActiveMode(m); setSelectedTestId(null); };

  const update = (field, value) => {
    if (!selectedTest) return;
    onUpdateFinding(entryKey, { region: selectedRegion, mode: activeMode, label: selectedTest.label, [field]: value });
  };

  const findingsByRegion = Object.entries(findings).reduce((acc, [key, val]) => {
    const r = val.region || "Other";
    if (!acc[r]) acc[r] = [];
    acc[r].push([key, val]);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: "200px", flexShrink: 0, borderRight: `1px solid ${C.border}`, paddingRight: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O }}>Region</div>
        <select value={selectedRegion} onChange={e => changeRegion(e.target.value)} style={{ ...inputStyle, fontWeight: "bold", color: C.O, borderColor: C.O }}>
          {CANONICAL_REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O }}>Body Map</div>
        <BodyMapWidget annotations={bodyAnnotations} onUpdate={onUpdateBodyAnnotations} compact={true} />
        <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O }}>Findings log</div>
        {Object.keys(findings).length === 0 && specialTests.length === 0
          ? <div style={{ fontSize: "11px", color: C.muted }}>No findings yet.</div>
          : <>
            {Object.entries(findingsByRegion).map(([region, entries]) => (
              <div key={region}>
                <div style={{ fontSize: "9px", color: C.gold, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{region}</div>
                {entries.map(([key, val]) => (
                  <div key={key} style={{ padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: "11px", color: C.text }}>{val.label}</div>
                    {val.modifiers?.length > 0 && <div style={{ fontSize: "9px", color: C.O }}>{val.modifiers.join(" · ")}</div>}
                    {val.result && <div style={{ fontSize: "10px", color: C.muted }}>{val.result}</div>}
                    {val.range != null && <div style={{ fontSize: "10px", color: C.muted }}>Range: {val.range}/5</div>}
                  </div>
                ))}
              </div>
            ))}
            {specialTests.length > 0 && (
              <div>
                <div style={{ fontSize: "9px", color: C.gold, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Special Tests</div>
                {specialTests.map(t => (
                  <div key={t.name} style={{ padding: "3px 0", borderBottom: `1px solid ${C.border}`, fontSize: "11px", color: C.text }}>{t.name}</div>
                ))}
              </div>
            )}
          </>}
      </div>

      {/* Main workspace */}
      <div style={{ flex: 1, paddingLeft: "14px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "10px", flexWrap: "wrap", flexShrink: 0 }}>
          {OBJECTIVE_MODE_TABS.map(tab => (
            <button key={tab} onClick={() => changeMode(tab)}
              style={{ padding: "5px 11px", border: `1px solid ${activeMode === tab ? C.O : C.border}`, borderRadius: "6px", background: activeMode === tab ? C.O : C.white, color: activeMode === tab ? C.white : C.text, cursor: "pointer", fontSize: "11px", fontFamily: "inherit", transition: "all 0.15s" }}>
              {tab}
            </button>
          ))}
        </div>

        {activeMode === "Special Tests" ? (
          <SpecialTestsPanel region={selectedRegion} specialTests={specialTests} onUpdateSpecialTests={onUpdateSpecialTests} />
        ) : (
          <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: "12px" }}>
            <div style={{ width: "50%", overflowY: "auto" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O, marginBottom: "6px" }}>{selectedRegion} — {activeMode}</div>
              {tests.length === 0
                ? <div style={{ fontSize: "12px", color: C.muted, fontStyle: "italic" }}>No tests configured for this region / mode.</div>
                : <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  {tests.map(test => {
                    const key = `${selectedRegion}::${test.id}`;
                    const hasData = !!findings[key];
                    const isSelected = test.id === resolvedTestId;
                    return (
                      <li key={test.id} onClick={() => setSelectedTestId(test.id)}
                        style={{ border: `1px solid ${isSelected ? C.O : C.border}`, borderLeft: `4px solid ${isSelected ? C.O : hasData ? C.gold : C.border}`, borderRadius: "6px", padding: "8px 10px", background: isSelected ? "#EAF2F5" : C.white, cursor: "pointer", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                        <span>{test.label}</span>
                        {hasData && <span style={{ fontSize: "9px", background: C.gold, color: C.white, borderRadius: "10px", padding: "1px 7px" }}>recorded</span>}
                      </li>
                    );
                  })}
                </ul>}
            </div>

            <div style={{ width: "50%", borderLeft: `1px solid ${C.border}`, paddingLeft: "12px", overflowY: "auto" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O, marginBottom: "6px" }}>Finding detail</div>
              {selectedTest ? (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", background: C.white, padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "13px", paddingBottom: "7px", borderBottom: `1px solid ${C.creamDark}`, color: C.O }}>{selectedTest.label}</div>
                  {REGION_MODIFIERS[selectedRegion] && (
                    <div>
                      <label style={labelStyle()}>Localise finding</label>
                      <ModifierPicker region={selectedRegion} selected={currentFinding.modifiers ?? []} onChange={val => update("modifiers", val)} accentColor={C.O} />
                    </div>
                  )}

                  {activeMode === "Movement / ROM" ? (
                    <>
                      <div style={{ background: C.cream, borderRadius: "6px", padding: "10px 12px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O, marginBottom: "8px" }}>Range</div>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                          {[0,1,2,3,4,5].map(n => {
                            const sel = currentFinding.range === n;
                            return (
                              <button key={n} onClick={() => update("range", sel ? null : n)}
                                style={{ flex: 1, padding: "6px 0", border: `1px solid ${sel ? C.O : C.border}`, borderRadius: "5px", background: sel ? C.O : C.white, color: sel ? C.white : C.muted, fontFamily: "inherit", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "all 0.15s" }}>
                                {n}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: C.muted, marginBottom: "8px" }}>
                          <span>No movement</span><span>Full range</span>
                        </div>
                        <button onClick={() => update("exceedsNormal", !currentFinding.exceedsNormal)}
                          style={{ padding: "3px 10px", border: `1px solid ${currentFinding.exceedsNormal ? C.O : C.border}`, borderRadius: "10px", background: currentFinding.exceedsNormal ? C.O : C.cream, color: currentFinding.exceedsNormal ? C.white : C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                          Exceeds normal range
                        </button>
                        <div style={{ marginTop: "10px" }}>
                          <label style={labelStyle()}>End-feel</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                            {[
                              { label: "Soft", hint: "Gradual, yielding — muscular" },
                              { label: "Firm", hint: "Springy, elastic — capsular" },
                              { label: "Hard", hint: "Abrupt, bony block" },
                              { label: "Spasm", hint: "Sudden muscular guarding" },
                              { label: "Empty", hint: "Pain stops movement before tissue resistance" },
                              { label: "N/A", hint: "Not assessed" },
                            ].map(({ label, hint }) => {
                              const sel = currentFinding.endFeel === label;
                              const isEmpty = label === "Empty";
                              return (
                                <button key={label} onClick={() => update("endFeel", sel ? null : label)} title={hint}
                                  style={{ padding: "3px 10px", border: `1px solid ${sel ? (isEmpty ? "#C62828" : C.O) : C.border}`, borderRadius: "10px", background: sel ? (isEmpty ? "#C62828" : C.O) : C.cream, color: sel ? C.white : C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: sel ? "bold" : "normal", transition: "all 0.15s" }}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          {currentFinding.endFeel === "Empty" && (
                            <div style={{ marginTop: "6px", fontSize: "10px", color: "#C62828", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "5px", padding: "5px 8px" }}>
                              ⚠ Empty end-feel — pain stops movement before tissue resistance. Do not push further. Consider flagging for investigation.
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ background: C.cream, borderRadius: "6px", padding: "10px 12px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O, marginBottom: "8px" }}>Quality</div>
                        <label style={labelStyle()}>Pain (0–10)</label>
                        <div style={{ display: "flex", gap: "3px", marginBottom: "10px" }}>
                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => {
                            const sel = currentFinding.painScore === n;
                            const bg = sel ? (n <= 3 ? "#2E7D32" : n <= 6 ? "#F57C00" : "#C62828") : C.white;
                            return (
                              <button key={n} onClick={() => update("painScore", sel ? null : n)}
                                style={{ flex: 1, padding: "5px 0", border: `1px solid ${sel ? bg : C.border}`, borderRadius: "4px", background: sel ? bg : C.white, color: sel ? C.white : C.muted, fontFamily: "inherit", fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.15s" }}>
                                {n}
                              </button>
                            );
                          })}
                        </div>
                        <label style={labelStyle()}>Movement descriptors</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {["Cheats","Not smooth","Asymmetrical"].map(desc => {
                            const sel = (currentFinding.qualityDescriptors ?? []).includes(desc);
                            return (
                              <button key={desc} onClick={() => {
                                const cur = currentFinding.qualityDescriptors ?? [];
                                update("qualityDescriptors", sel ? cur.filter(x => x !== desc) : [...cur, desc]);
                              }}
                                style={{ padding: "3px 12px", border: `1px solid ${sel ? C.O : C.border}`, borderRadius: "12px", background: sel ? C.O : C.white, color: sel ? C.white : C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: sel ? "bold" : "normal", transition: "all 0.15s" }}>
                                {desc}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={labelStyle()}>Finding</label>
                      <select value={currentFinding.result ?? ""} onChange={e => update("result", e.target.value)} style={inputStyle}>
                        <option value="">— select —</option>
                        {selectedTest.results.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={labelStyle()}>Clinical notes</label>
                    <textarea rows={2} placeholder="Additional observations…" value={currentFinding.notes ?? ""} onChange={e => update("notes", e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
                  </div>
                </div>
              ) : <div style={{ color: C.muted, fontSize: "12px" }}>Select a test from the list.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Special Tests Panel ──────────────────────────────────────────────────────

function ResultButton({ value, option, onChange }) {
  const selected = value === option;
  const optionColor = option === "+" ? "#2E7D32" : option === "−" ? "#C62828" : C.muted;
  return (
    <button onClick={() => onChange(selected ? "" : option)}
      style={{ flex: 1, padding: "5px 4px", border: `1px solid ${selected ? optionColor : C.border}`, borderRadius: "5px", background: selected ? optionColor : C.cream, color: selected ? C.white : C.muted, fontFamily: "inherit", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "all 0.15s" }}>
      {option}
    </button>
  );
}

function SpecialTestCard({ testName, data, onChange, onRemove }) {
  const set = (field, val) => onChange({ ...data, [field]: val });
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.O}`, borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: "bold", fontSize: "13px", color: C.O }}>{testName}</div>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "18px", lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr", gap: "6px", alignItems: "center" }}>
        <div />
        <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted, textAlign: "center" }}>Before</div>
        <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted, textAlign: "center" }}>After</div>
        <div style={{ fontSize: "11px", color: C.muted, fontWeight: "bold" }}>Left</div>
        <div style={{ display: "flex", gap: "4px" }}>{TEST_RESULT_OPTIONS.map(opt => <ResultButton key={opt} option={opt} value={data.beforeL ?? ""} onChange={val => set("beforeL", val)} />)}</div>
        <div style={{ display: "flex", gap: "4px" }}>{TEST_RESULT_OPTIONS.map(opt => <ResultButton key={opt} option={opt} value={data.afterL ?? ""} onChange={val => set("afterL", val)} />)}</div>
        <div style={{ fontSize: "11px", color: C.muted, fontWeight: "bold" }}>Right</div>
        <div style={{ display: "flex", gap: "4px" }}>{TEST_RESULT_OPTIONS.map(opt => <ResultButton key={opt} option={opt} value={data.beforeR ?? ""} onChange={val => set("beforeR", val)} />)}</div>
        <div style={{ display: "flex", gap: "4px" }}>{TEST_RESULT_OPTIONS.map(opt => <ResultButton key={opt} option={opt} value={data.afterR ?? ""} onChange={val => set("afterR", val)} />)}</div>
      </div>
      <div>
        <label style={labelStyle()}>Notes</label>
        <textarea rows={2} value={data.notes ?? ""} onChange={e => set("notes", e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
      </div>
    </div>
  );
}

function SpecialTestsPanel({ region, specialTests, onUpdateSpecialTests }) {
  const [selectedTest, setSelectedTest] = useState("");
  const tests = specialTests ?? [];
  const available = (SPECIAL_TESTS_BY_REGION[region] ?? []).filter(t => !tests.find(e => e.name === t));

  const addTest = () => {
    if (!selectedTest) return;
    onUpdateSpecialTests([...tests, { name: selectedTest, region, beforeL: "", beforeR: "", afterL: "", afterR: "", notes: "" }]);
    setSelectedTest("");
  };

  const updateTest = (name, updated) => onUpdateSpecialTests(tests.map(t => t.name === name ? { ...t, ...updated } : t));
  const removeTest = (name) => onUpdateSpecialTests(tests.filter(t => t.name !== name));
  const byRegion = tests.reduce((acc, t) => { const r = t.region || "Other"; if (!acc[r]) acc[r] = []; acc[r].push(t); return acc; }, {});

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ background: "#EAF2F5", border: `1px solid ${C.O}`, borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: C.O, lineHeight: "1.6" }}>
        <strong>Scope note:</strong> Special tests are assessment tools to inform clinical reasoning, not to diagnose. Document results as observations only.
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", padding: "10px 12px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.O, alignSelf: "center", whiteSpace: "nowrap" }}>Add test</div>
        <div style={{ flex: 2, minWidth: "200px" }}>
          <label style={labelStyle()}>Test — {region}</label>
          <select value={selectedTest} onChange={e => setSelectedTest(e.target.value)} style={inputStyle}>
            <option value="">— select test —</option>
            {available.map(t => <option key={t}>{t}</option>)}
            {available.length === 0 && <option disabled>All tests for this region added</option>}
          </select>
        </div>
        <button onClick={addTest} disabled={!selectedTest}
          style={{ padding: "7px 18px", alignSelf: "flex-end", background: selectedTest ? C.O : C.creamDark, color: selectedTest ? C.white : C.muted, border: "none", borderRadius: "6px", cursor: selectedTest ? "pointer" : "default", fontFamily: "inherit", fontSize: "12px", fontWeight: "bold", transition: "all 0.15s", whiteSpace: "nowrap" }}>
          + Add
        </button>
      </div>
      {tests.length === 0
        ? <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: "13px", gap: "8px", opacity: 0.5 }}>
            <div style={{ fontSize: "28px" }}>＋</div>
            <div>Select a test above to begin</div>
          </div>
        : Object.entries(byRegion).map(([r, rTests]) => (
          <div key={r}>
            <RegionHeading label={r} color={C.O} />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rTests.map(test => (
                <SpecialTestCard key={test.name} testName={test.name} data={test}
                  onChange={updated => updateTest(test.name, updated)} onRemove={() => removeTest(test.name)} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ─── A Tab ────────────────────────────────────────────────────────────────────

// ─── A Tab — Action ───────────────────────────────────────────────────────────

function TreatmentItemCard({ item, onRemove, onUpdateTechniques, accentColor }) {
  const isJoint = item.structureType === "joint";
  const techniques = isJoint ? JOINT_TECHNIQUES : SOFT_TISSUE_TECHNIQUES;
  const typeColor = isJoint ? C.joint : C.softTissue;
  const typeLabel = isJoint ? "Joint" : "Soft tissue";
  const borderColor = accentColor || typeColor;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${borderColor}`, borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "13px", color: typeColor }}>{item.structure}</div>
          <div style={{ fontSize: "10px", color: C.muted, marginTop: "1px" }}>
            <span style={{ background: typeColor, color: C.white, borderRadius: "8px", padding: "1px 6px", fontSize: "9px", marginRight: "6px" }}>{typeLabel}</span>
            {item.region}
          </div>
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "18px", lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>
      <div>
        <label style={labelStyle()}>Techniques</label>
        <TechniquePicker options={techniques} selected={item.techniques ?? []} onChange={onUpdateTechniques} accentColor={typeColor} />
      </div>
    </div>
  );
}

function AssessmentTab({ data, onChange }) {
  const set = (field, value) => onChange({ ...data, [field]: value });
  const [selRegion, setSelRegion] = useState("");
  const [selStructureType, setSelStructureType] = useState("");
  const [selStructure, setSelStructure] = useState("");
  const planItems = data.planItems ?? [];
  const hierarchy = selRegion ? TREATMENT_HIERARCHY[selRegion] : null;
  const structuresForType = hierarchy && selStructureType ? (selStructureType === "softTissue" ? hierarchy.softTissue : hierarchy.joints) : [];
  const usedKeys = planItems.map(i => `${i.region}::${i.structure}`);
  const availableStructures = structuresForType.filter(s => !usedKeys.includes(`${selRegion}::${s}`));

  const addItem = () => {
    if (!selStructure) return;
    onChange({ ...data, planItems: [...planItems, { region: selRegion, structureType: selStructureType, structure: selStructure, techniques: [] }] });
    setSelStructure("");
  };

  const updateItemTechniques = (region, structure, techniques) =>
    onChange({ ...data, planItems: planItems.map(i => i.region === region && i.structure === structure ? { ...i, techniques } : i) });

  const removeItem = (region, structure) =>
    onChange({ ...data, planItems: planItems.filter(i => !(i.region === region && i.structure === structure)) });

  const itemsByRegion = planItems.reduce((acc, item) => {
    if (!acc[item.region]) acc[item.region] = [];
    acc[item.region].push(item);
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Clinical reasoning */}
      <div style={{ background: "#EEF5EC", border: `1px solid ${C.A}`, borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: C.A, lineHeight: "1.6" }}>
        <strong>Scope note:</strong> Use language like "findings are consistent with", "tissues of concern include", "findings suggest involvement of". Avoid stating the client "has" a specific condition.
      </div>
      {[
        { field: "synthesis",        label: "Neutral synthesis",           hint: "Brief summary of what the findings suggest — use 'consistent with' or 'findings suggest'",   rows: 3, placeholder: "e.g. 'Findings are consistent with involvement of the upper trapezius and suboccipitals, with restricted lower cervical mobility contributing to the presenting complaint.'" },
        { field: "priorities",       label: "Treatment priorities",        hint: "What will you address first and why, based on today's findings?",                              rows: 2, placeholder: "e.g. 'Priority: address upper trapezius and levator TrPs, restore cervical rotation ROM, then reassess.'" },
        { field: "changeFromLast",   label: "Change since last session",   hint: "How does today compare to the previous session?",                                             rows: 2, placeholder: "e.g. 'Client reports improvement in morning stiffness. Rotation ROM improved bilaterally.'" },
        { field: "continueOrModify", label: "Continue or modify approach", hint: "Do today's findings support continuing as planned, or does something need to change?",        rows: 2, placeholder: "e.g. 'Today's findings support continuing the current approach.'" },
      ].map(({ field, label, hint, rows, placeholder }) => (
        <div key={field} style={{ background: C.white, border: `1px solid ${data[field] ? C.A : C.border}`, borderLeft: `4px solid ${data[field] ? C.A : C.border}`, borderRadius: "6px", padding: "10px 12px", transition: "all 0.15s" }}>
          <label style={labelStyle(data[field] ? C.A : C.muted)}>{label}</label>
          <div style={{ fontSize: "10px", color: C.muted, marginBottom: "5px", fontStyle: "italic" }}>{hint}</div>
          <textarea rows={rows} placeholder={placeholder} value={data[field] ?? ""} onChange={e => set(field, e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
        </div>
      ))}

      {/* Treatment performed */}
      <div style={{ height: "1px", background: C.border, margin: "4px 0" }} />
      <div style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase", color: C.A }}>Treatment performed</div>
      <div style={{ padding: "12px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "130px" }}>
            <label style={labelStyle()}>1. Region</label>
            <select value={selRegion} onChange={e => { setSelRegion(e.target.value); setSelStructureType(""); setSelStructure(""); }} style={inputStyle}>
              <option value="">— select —</option>
              {CANONICAL_REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "130px", opacity: selRegion ? 1 : 0.4, transition: "opacity 0.2s" }}>
            <label style={labelStyle()}>2. Type</label>
            <select value={selStructureType} onChange={e => { setSelStructureType(e.target.value); setSelStructure(""); }} disabled={!selRegion} style={inputStyle}>
              <option value="">— select —</option>
              {hierarchy?.softTissue?.length > 0 && <option value="softTissue">Soft tissue</option>}
              {hierarchy?.joints?.length > 0 && <option value="joint">Joint</option>}
            </select>
          </div>
          <div style={{ flex: 2, minWidth: "160px", opacity: selStructureType ? 1 : 0.4, transition: "opacity 0.2s" }}>
            <label style={labelStyle()}>3. Structure</label>
            <select value={selStructure} onChange={e => setSelStructure(e.target.value)} disabled={!selStructureType} style={inputStyle}>
              <option value="">— select —</option>
              {availableStructures.map(s => <option key={s}>{s}</option>)}
              {selStructureType && availableStructures.length === 0 && <option disabled>All structures added</option>}
            </select>
          </div>
          <button onClick={addItem} disabled={!selStructure}
            style={{ padding: "7px 18px", alignSelf: "flex-end", background: selStructure ? C.A : C.creamDark, color: selStructure ? C.white : C.muted, border: "none", borderRadius: "6px", cursor: selStructure ? "pointer" : "default", fontFamily: "inherit", fontSize: "12px", fontWeight: "bold", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            + Add
          </button>
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "10px", flexWrap: "wrap" }}>
          <span style={{ color: C.softTissue }}>■ Soft tissue → General soft tissue, MFR, TrP, Cross-fibre friction, Pin and stretch, Passive stretch, PNF, MET, Dry needling, Cupping</span>
          <span style={{ color: C.joint }}>■ Joint → Joint mobilisation, Traction, Scapular mobilisation</span>
        </div>
      </div>
      {planItems.length === 0
        ? <div style={{ padding: "16px", textAlign: "center", color: C.muted, fontSize: "12px", opacity: 0.6 }}>Select a region, type, and structure above to record what you treated</div>
        : Object.entries(itemsByRegion).map(([region, items]) => (
          <div key={region}>
            <RegionHeading label={region} color={C.A} />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map(item => (
                <TreatmentItemCard key={`${item.region}-${item.structure}`} item={item}
                  onRemove={() => removeItem(item.region, item.structure)}
                  onUpdateTechniques={techniques => updateItemTechniques(item.region, item.structure, techniques)}
                  accentColor={C.A} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ─── P Tab — Prescription ─────────────────────────────────────────────────────

function PlanTab({ data, onChange }) {
  const set = (field, value) => onChange({ ...data, [field]: value });
  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ background: "#F3F0F8", border: `1px solid ${C.P}`, borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: C.P, lineHeight: "1.6" }}>
        What the client is taking away from this session — home care, load adjustments, exercises, stretches, lifestyle changes.
      </div>
      {[
        { field: "homeAdvice",   label: "Home care & advice",      rows: 3, placeholder: "Specific stretches, exercises, self-massage, heat/ice, load adjustments, postural cues…" },
        { field: "workChanges",  label: "Work / activity changes", rows: 2, placeholder: "Ergonomic adjustments, activity modifications, things to avoid this week…" },
        { field: "reviewPlan",   label: "Review / follow-up",      rows: 2, placeholder: "Recommended return interval, what to monitor, when to seek further care…" },
        { field: "treatmentGoals", label: "Agreed treatment goals", rows: 2, placeholder: "Short and long-term goals discussed with the client…" },
      ].map(({ field, label, rows, placeholder }) => (
        <div key={field} style={{ background: C.white, border: `1px solid ${data[field] ? C.P : C.border}`, borderLeft: `4px solid ${data[field] ? C.P : C.border}`, borderRadius: "6px", padding: "10px 12px", transition: "all 0.15s" }}>
          <label style={labelStyle(data[field] ? C.P : C.muted)}>{label}</label>
          <textarea rows={rows} placeholder={placeholder} value={data[field] ?? ""} onChange={e => set(field, e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Note export ──────────────────────────────────────────────────────────────

function buildNoteHTML(client, session) {
  const { subjective = {}, findings = {}, specialTests = [], assessment = {}, plan = {}, bodyAnnotations = [] } = session;
  const planItems = (assessment.planItems ?? []).filter(i => i.techniques?.length > 0);
  const fmt = (val) => val || "—";
  const date = session.date ? new Date(session.date).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const sHead = (letter, label, color) =>
    `<div style="display:flex;align-items:center;gap:8px;margin:10px 0 5px;">
      <span style="background:${color};color:#fff;font-weight:bold;font-size:11px;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${letter}</span>
      <span style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:${color};">${label}</span>
      <span style="flex:1;height:1px;background:#DDD0C0;display:inline-block;"></span>
    </div>`;

  const row = (cells, isHeader) =>
    `<tr>${cells.map(c => isHeader
      ? `<th style="background:#6B1F2A;color:#FAF6EF;padding:4px 6px;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;text-align:left;">${c}</th>`
      : `<td style="padding:4px 6px;font-size:10px;border-bottom:1px solid #DDD0C0;vertical-align:top;">${c}</td>`
    ).join("")}</tr>`;

  const socratesRows = [
    ["Site", [subjective.modifiers?.join(" "), subjective.region].filter(Boolean).join(" · ") || "—"],
    ["Onset", fmt(subjective.onset)],
    ["Character", fmt(subjective.character)],
    ["Radiation", fmt(subjective.radiation)],
    ["Associations", fmt(subjective.associations)],
    ["Time course", fmt(subjective.timing)],
    ["Made worse by", (subjective.exacerbating ?? []).join(", ") || "—"],
    ["Relieved by", (subjective.relieving ?? []).join(", ") || "—"],
    ["Severity", subjective.severityRest || subjective.severityWorst ? `Rest: ${subjective.severityRest ?? "—"}/10 · Worst: ${subjective.severityWorst ?? "—"}/10` : "—"],
  ].filter(([, v]) => v !== "—");

  const oRows = Object.entries(findings).map(([key, f]) => {
    const loc = f.modifiers?.length > 0 ? f.modifiers.join(" · ") : "—";
    const finding = f.mode === "Movement / ROM"
      ? [f.range != null ? `Range: ${f.range}/5` : null, f.exceedsNormal ? "Exceeds normal" : null, f.endFeel ? `End-feel: ${f.endFeel}` : null, f.painScore != null ? `Pain: ${f.painScore}/10` : null, f.qualityDescriptors?.length > 0 ? f.qualityDescriptors.join(", ") : null].filter(Boolean).join(" · ")
      : fmt(f.result);
    return [f.label || key, loc, finding || "—", f.notes || ""];
  });

  const stRows = specialTests.map(t => [t.name, t.region, `BL:${t.beforeL||"—"} BR:${t.beforeR||"—"}`, `AL:${t.afterL||"—"} AR:${t.afterR||"—"}`, t.notes || ""]);
  const pItems = (assessment.planItems ?? []).filter(i => i.techniques?.length > 0);
  const clientSlug = (client.name || "client").replace(/\s+/g, "-").toLowerCase();

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Session Note — ${client.name} — ${date}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;font-size:11px;color:#2A1A1E;background:#fff}@page{size:A4;margin:14mm}@media print{.no-print{display:none!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}.page{max-width:780px;margin:0 auto;padding:16px}table{width:100%;border-collapse:collapse;margin-bottom:6px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}.nh{background:#6B1F2A;color:#FAF6EF;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.nh h1{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#C9973A}.cb{display:flex;gap:20px;background:#F0E8D8;padding:6px 10px;font-size:10px;margin-bottom:8px;border-radius:4px}.cb strong{color:#6B1F2A}.narr{background:#FAF6EF;border:1px solid #DDD0C0;border-radius:4px;padding:6px 8px;font-size:10px;line-height:1.5;margin-top:4px;white-space:pre-wrap}.tools{display:flex;gap:8px;margin-bottom:12px}.btn{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:bold}.warn{background:#FEF2F2;border:1px solid #FECACA;border-radius:4px;padding:4px 8px;font-size:10px;color:#C62828;margin-top:4px}</style>
</head><body><div class="page">
<div class="tools no-print">
  <button class="btn" style="background:#6B1F2A;color:#FAF6EF" onclick="window.print()">🖨 Print / Save as PDF</button>
  <button class="btn" style="background:#F0E8D8;color:#6B1F2A;border:1px solid #DDD0C0" onclick="downloadHTML()">⬇ Download HTML</button>
</div>
<div class="nh"><div><h1>Eadig Manual Therapies</h1><div style="font-size:10px;color:rgba(255,255,255,0.6)">Session Notes</div></div><div style="font-size:10px;color:rgba(255,255,255,0.6)">Generated ${new Date().toLocaleDateString("en-AU")}</div></div>
<div class="cb"><span><strong>Client:</strong> ${fmt(client.name)}</span><span><strong>DOB:</strong> ${fmt(client.dob)}</span><span><strong>Date:</strong> ${date}</span><span><strong>Session:</strong> ${fmt(String(session.sessionNumber))}</span></div>
${(client.contraindications ?? []).length > 0 ? `<div class="warn">⚠ Contraindications on file: ${client.contraindications.join(", ")}</div>` : ""}
<div class="two-col">
<div>
${sHead("S","Subjective","#B05520")}
${socratesRows.length > 0 ? `<table>${socratesRows.map(([l,v]) => row([`<strong>${l}</strong>`,v])).join("")}</table>` : `<div style="color:#7A6068;font-size:10px;font-style:italic">No subjective data recorded.</div>`}
${subjective.narrative ? `<div class="narr">${subjective.narrative}</div>` : ""}
${sHead("O","Objective","#1A5C6B")}
${oRows.length > 0 ? `<table>${row(["Test","Location","Finding","Notes"],true)}${oRows.map(r => row(r)).join("")}</table>` : `<div style="color:#7A6068;font-size:10px;font-style:italic">No objective findings recorded.</div>`}
${stRows.length > 0 ? `<div style="font-size:10px;font-weight:bold;color:#1A5C6B;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.06em">Special Tests</div><table>${row(["Test","Region","Before","After","Notes"],true)}${stRows.map(r => row(r)).join("")}</table>` : ""}
${bodyAnnotations.length > 0 ? `
<div style="font-size:10px;font-weight:bold;color:#6B1F2A;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.06em">Body Map Annotations</div>
<table>
${row(["#","Layer","Zone","Note"],true)}
${bodyAnnotations.map(a => row([
  `<span style="background:${a.layer==="S"?"#B05520":"#1A5C6B"};color:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;font-size:9px;font-weight:bold">${a.number}</span>`,
  `<span style="color:${a.layer==="S"?"#B05520":"#1A5C6B"};font-weight:bold">${a.layer}</span>`,
  a.zoneLabel,
  a.note || "—"
])).join("")}
</table>` : ""}
</div>
<div>
${sHead("A","Action","#3B5E2B")}
${["synthesis","priorities","changeFromLast","continueOrModify"].some(f => assessment[f])
  ? `<table>${assessment.synthesis?row(["<strong>Synthesis</strong>",assessment.synthesis]):""}${assessment.priorities?row(["<strong>Priorities</strong>",assessment.priorities]):""}${assessment.changeFromLast?row(["<strong>Change since last</strong>",assessment.changeFromLast]):""}${assessment.continueOrModify?row(["<strong>Continue / modify</strong>",assessment.continueOrModify]):""}</table>`
  : ""}
${pItems.length > 0 ? `<div style="font-size:10px;font-weight:bold;color:#3B5E2B;margin:6px 0 3px;text-transform:uppercase;letter-spacing:.06em">Treatment performed</div><table>${row(["Structure","Type","Techniques"],true)}${pItems.map(i => row([i.structure,`<span style="background:${i.structureType==="joint"?"#1E3A5C":"#5C3A1E"};color:#fff;border-radius:6px;padding:1px 5px;font-size:9px">${i.structureType==="joint"?"Joint":"Soft tissue"}</span>`,i.techniques.join(", ")])).join("")}</table>` : `<div style="color:#7A6068;font-size:10px;font-style:italic">No treatment recorded.</div>`}
${sHead("P","Prescription","#4A3570")}
${plan.homeAdvice||plan.workChanges||plan.reviewPlan||plan.treatmentGoals?`<table>${plan.homeAdvice?row(["<strong>Home care</strong>",plan.homeAdvice]):""}${plan.workChanges?row(["<strong>Work / activity</strong>",plan.workChanges]):""}${plan.reviewPlan?row(["<strong>Review</strong>",plan.reviewPlan]):""}${plan.treatmentGoals?row(["<strong>Goals</strong>",plan.treatmentGoals]):""}</table>`:""}
${specialTests.some(t=>t.afterL==="+"||t.afterR==="+")?`<div class="warn">⚠ One or more special tests remain positive after treatment.</div>`:""}
</div></div>
<div style="margin-top:12px;padding-top:6px;border-top:1px solid #DDD0C0;font-size:9px;color:#7A6068;display:flex;justify-content:space-between"><span>Eadig Manual Therapies — Confidential clinical record</span><span>${client.name} · Session ${session.sessionNumber} · ${date}</span></div>
</div>
<script>function downloadHTML(){const b=new Blob([document.documentElement.outerHTML],{type:"text/html"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="session-note-${clientSlug}-${date.replace(/\s/g,"-")}.html";a.click()}</script>
</body></html>`;
}

function NoteOutputModal({ client, session, onClose }) {
  const openNote = () => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups to open the note."); return; }
    win.document.write(buildNoteHTML(client, session));
    win.document.close();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.white, borderRadius: "10px", padding: "28px 32px", maxWidth: "420px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", fontFamily: "inherit" }}>
        <div style={{ fontSize: "15px", fontWeight: "bold", color: C.maroon, marginBottom: "8px" }}>Generate Session Note</div>
        <div style={{ fontSize: "12px", color: C.muted, marginBottom: "20px", lineHeight: "1.6" }}>Opens your note in a new tab as a compact A4 document.<br />Print (or Save as PDF), or Download as an HTML file.</div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={openNote} style={{ flex: 1, padding: "10px", background: C.maroon, color: C.white, border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: "bold" }}>Open Note</button>
          <button onClick={onClose} style={{ padding: "10px 16px", background: C.creamDark, color: C.muted, border: `1px solid ${C.border}`, borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Session Screen ───────────────────────────────────────────────────────────

function SessionScreen({ session: initialSession, client, allSessions, onSave, onBack }) {
  const [soapTab, setSoapTab] = useState("S");
  const [session, setSession] = useState(initialSession);
  const [dirty, setDirty] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const updateSession = (patch) => { setSession(s => ({ ...s, ...patch })); setDirty(true); };
  const updateFinding = (entryKey, patch) =>
    updateSession({ findings: { ...(session.findings ?? {}), [entryKey]: { ...(session.findings?.[entryKey] ?? { modifiers: [] }), ...patch } } });

  const handleSave = async () => {
    const updated = { ...session, updatedAt: today };
    await onSave(updated);
    setDirty(false);
  };

  const progressMap = {
    S: Object.values(session.subjective ?? {}).filter(Boolean).length,
    O: Object.keys(session.findings ?? {}).length + (session.specialTests ?? []).length,
    A: Object.values(session.assessment ?? {}).filter(v => v && typeof v !== 'object').length + (session.assessment?.planItems ?? []).filter(i => (i.techniques ?? []).length > 0).length,
    P: Object.values(session.plan ?? {}).filter(Boolean).length,
  };

  const hasContraindications = (client.contraindications ?? []).length > 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.cream, color: C.text, fontFamily: "'Georgia', 'Times New Roman', serif", overflow: "hidden" }}>
      {showNote && <NoteOutputModal client={client} session={session} onClose={() => setShowNote(false)} />}

      <AppBar
        subtitle={`${client.name} — Session ${session.sessionNumber}`}
        onBack={onBack}
        actions={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {dirty && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>Unsaved changes</span>}
            <button onClick={() => setShowNote(true)}
              style={{ padding: "5px 12px", background: "rgba(255,255,255,0.15)", color: C.white, border: "1px solid rgba(255,255,255,0.3)", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}>
              Generate Note ↗
            </button>
            <button onClick={handleSave}
              style={{ padding: "5px 14px", background: C.gold, color: C.maroon, border: "none", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: "bold" }}>
              Save Session
            </button>
          </div>
        }
      />

      {/* Contraindication banner */}
      {hasContraindications && (
        <div style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA", padding: "6px 20px", fontSize: "11px", color: "#C62828", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{ fontWeight: "bold" }}>⚠</span>
          {client.contraindications.join(" · ")}
        </div>
      )}

      {/* SOAP tabs */}
      <div style={{ display: "flex", background: C.white, borderBottom: `2px solid ${C[soapTab]}`, flexShrink: 0 }}>
        {SOAP_TABS.map(tab => {
          const active = soapTab === tab;
          const color = C[tab];
          const prog = progressMap[tab];
          return (
            <button key={tab} onClick={() => setSoapTab(tab)}
              style={{ flex: 1, padding: "10px 8px", border: "none", borderBottom: active ? `3px solid ${color}` : "3px solid transparent", background: active ? `${color}18` : "transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", transition: "all 0.15s" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: active ? color : C.muted, lineHeight: 1 }}>{tab}</div>
              <div style={{ fontSize: "10px", color: active ? color : C.muted, letterSpacing: "0.05em" }}>{SOAP_LABELS[tab]}</div>
              {prog > 0 && <div style={{ fontSize: "9px", background: color, color: C.white, borderRadius: "8px", padding: "1px 6px", marginTop: "1px" }}>{prog} {tab === "O" ? "findings" : tab === "A" ? "items" : tab === "P" ? "fields" : "fields"}</div>}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {soapTab === "S" && <SubjectiveTab data={session.subjective ?? {}} onChange={s => updateSession({ subjective: s })} />}
        {soapTab === "O" && <ObjectiveTab findings={session.findings ?? {}} onUpdateFinding={updateFinding} specialTests={session.specialTests ?? []} onUpdateSpecialTests={st => updateSession({ specialTests: st })} bodyAnnotations={session.bodyAnnotations ?? []} onUpdateBodyAnnotations={ba => updateSession({ bodyAnnotations: ba })} />}
        {soapTab === "A" && <AssessmentTab data={session.assessment ?? {}} onChange={a => updateSession({ assessment: a })} />}
        {soapTab === "P" && <PlanTab data={session.plan ?? { planItems: [] }} onChange={p => updateSession({ plan: p })} />}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("loading"); // loading | clientList | intake | profile | session
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([storage.getClients(), storage.getSessions()]);
      setClients(c);
      setSessions(s);
      setScreen("clientList");
    })();
  }, []);

  const clientsWithCount = clients.map(c => ({
    ...c,
    sessionCount: sessions.filter(s => s.clientId === c.id).length,
  }));

  const activeClient = clients.find(c => c.id === activeClientId) ?? null;
  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  const saveClient = async (client) => {
    const updated = clients.find(c => c.id === client.id)
      ? clients.map(c => c.id === client.id ? client : c)
      : [...clients, client];
    setClients(updated);
    await storage.saveClients(updated);
    setActiveClientId(client.id);
    setScreen("profile");
  };

  const saveSession = async (session) => {
    const updated = sessions.find(s => s.id === session.id)
      ? sessions.map(s => s.id === session.id ? session : s)
      : [...sessions, session];
    setSessions(updated);
    await storage.saveSessions(updated);
  };

  const startNewSession = () => {
    const clientSessions = sessions.filter(s => s.clientId === activeClientId);
    const newSession = {
      id: genId(),
      clientId: activeClientId,
      sessionNumber: clientSessions.length + 1,
      date: today,
      subjective: {},
      findings: {},
      specialTests: [],
      assessment: {},
      plan: { planItems: [] },
      createdAt: today,
      updatedAt: null,
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setScreen("session");
  };

  if (screen === "loading") {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, fontFamily: "'Georgia', serif", color: C.muted, flexDirection: "column", gap: "12px" }}>
        <div style={{ width: "32px", height: "32px", border: `2px solid ${C.gold}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: C.gold, fontWeight: "bold" }}>E</div>
        <div style={{ fontSize: "12px" }}>Loading…</div>
      </div>
    );
  }

  if (screen === "clientList") return (
    <ClientListScreen
      clients={clientsWithCount}
      onSelectClient={id => { setActiveClientId(id); setScreen("profile"); }}
      onNewClient={() => { setEditingClient(null); setScreen("intake"); }}
    />
  );

  if (screen === "intake") return (
    <IntakeFormScreen
      client={editingClient}
      onSave={saveClient}
      onCancel={() => setScreen(activeClientId ? "profile" : "clientList")}
    />
  );

  if (screen === "profile" && activeClient) return (
    <ClientProfileScreen
      client={activeClient}
      sessions={sessions}
      onNewSession={startNewSession}
      onOpenSession={id => { setActiveSessionId(id); setScreen("session"); }}
      onEditClient={() => { setEditingClient(activeClient); setScreen("intake"); }}
      onBack={() => setScreen("clientList")}
    />
  );

  if (screen === "session" && activeSession && activeClient) return (
    <SessionScreen
      session={activeSession}
      client={activeClient}
      allSessions={sessions}
      onSave={saveSession}
      onBack={() => setScreen("profile")}
    />
  );

  return null;
}
