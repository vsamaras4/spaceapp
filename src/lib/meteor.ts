// lib/meteor.ts
export type GeoLocation = {
  lat: number;
  lng: number;
};

export type MeteorState = {
  diameter_m: number; // meters
  velocity_kms: number; // km/s
  angle_deg: number; // degrees from horizontal
  impactLocation?: GeoLocation; // impact location on world map (lat/lng)
};


export const DIAMETER = {
min: 10, // ~small building-sized meteoroid (placeholder UI range)
avg: 100, // convenient mid reference for UI
max: 10000, // ~10 km (Chicxulub-scale); prototype upper bound
};


export const VELOCITY = {
min: 12, // km/s (approx lower-bound atmospheric entry)
avg: 20, // km/s (common reference)
max: 72, // km/s (upper-ish bound)
};


export const ANGLE = {
min: 5, // deg (very shallow)
avg: 45, // deg (often used in models)
max: 90, // deg (vertical)
};


export const DEFAULT_STATE: MeteorState = {
diameter_m: DIAMETER.avg,
velocity_kms: VELOCITY.avg,
angle_deg: ANGLE.avg,
};


export type WizardStep = 0 | 1 | 2 | 3 | 4; // 3 = Impact Location, 4 = Impact Results


export function clamp(n: number, min: number, max: number) {
return Math.min(max, Math.max(min, n));
}


export function prettyNumber(n: number) {
return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}


export function round(n: number, places = 0) {
const p = 10 ** places; return Math.round(n * p) / p;
}