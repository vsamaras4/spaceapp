// lib/meteor.ts
export type GeoLocation = {
  lat: number;
  lng: number;
};

export type MeteorState = {
  diameter_m: number; // meters
  velocity_kms: number; // km/s
  angle_deg: number; // degrees from horizontal
  density_kgm3: number; // kg/m³
  impactLocation?: GeoLocation; // impact location on world map (lat/lng)
};

export type ImpactInputs = {
  diameter: number;   // meters
  density: number;    // kg/m³
  velocity: number;   // m/s
  angle: number;      // degrees from horizontal
};

export type ImpactResults = {
  mass: number;
  kineticEnergy: number;
  energyTNT: number;
  volcanoEquivalent: number;
  craterDiameter: number;
  severeDamageRadius: number;
  thirdDegreeBurnRadius: number;
  secondDegreeBurnRadius: number;
  noiseDamageRadius: number;
  ozoneDepletionPercent: number;
  acidRainSeverity: string;
  climateImpact: string;
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

export const DENSITY = {
min: 1000, // kg/m³ (ice/water)
avg: 3000, // kg/m³ (rock)
max: 8000, // kg/m³ (iron)
};

export const DEFAULT_STATE: MeteorState = {
diameter_m: DIAMETER.avg,
velocity_kms: VELOCITY.avg,
angle_deg: ANGLE.avg,
density_kgm3: DENSITY.avg,
};


export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0-2 = Parameters, 3 = Review, 4 = Impact Location, 5 = Impact Results


export function clamp(n: number, min: number, max: number) {
return Math.min(max, Math.max(min, n));
}


export function prettyNumber(n: number) {
return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}


export function round(n: number, places = 0) {
const p = 10 ** places; return Math.round(n * p) / p;
}

// Ozone depletion estimator based on nonlinear scaling with impact energy
export function estimateOzoneDepletion(energyTNT: number) {
  // Energy in MT of TNT
  const energyMT = energyTNT;
  if (energyMT < 1e3) return 0; // negligible
  if (energyMT > 1e9) return 50; // largest plausible impact like Chicxulub
  // Nonlinear scaling: small impacts -> very small depletion, large impacts -> up to ~50%
  return Math.min(50, 0.01 * Math.pow(energyMT / 1e3, 0.5) * 50);
}

// Crater diameter calculation using Holsapple & Schmidt scaling laws
export function calculateCraterDiameter(
  diameter: number,      // impactor diameter (m)
  density: number,       // impactor density (kg/m³)
  velocity: number,      // impact velocity (m/s)
  angle: number,         // impact angle (degrees from horizontal)
  targetDensity = 2700,  // target density (Earth crust, kg/m³)
  gravity = 9.81         // Earth surface gravity (m/s²)
): number {
  // Convert angle to radians
  const theta = (angle * Math.PI) / 180;

  // Constants from Holsapple & Schmidt scaling laws
  const mu = 0.22;   // material constant for rock
  const k1 = 1.161;  // scaling coefficient (empirical)

  // Impactor radius
  const r = diameter / 2;

  // Transient crater diameter (Holsapple 1993, Melosh 1989)
  const transientCrater =
    k1 *
    Math.pow(gravity, -mu) *
    Math.pow(density / targetDensity, 1 / 3) *
    Math.pow(r, 1 - mu) *
    Math.pow(velocity, 2 * mu) *
    Math.pow(Math.sin(theta), 1 / 3);

  // Final crater correction factor (collapse widens it)
  // ~1.25 for simple craters, ~1.5–2 for large craters
  const correctionFactor = 1.3;

  const finalCrater = transientCrater * correctionFactor;

  return finalCrater; // in meters
}

// Utility functions for comet impact modeling
// Based on research from NASA, USGS, LPI, and peer-reviewed studies (see educational notes in UI)
export function calculateImpact(inputs: ImpactInputs): ImpactResults {
  const { diameter, density, velocity, angle } = inputs;

  // Basic physical constants
  const mass = (4 / 3) * Math.PI * Math.pow(diameter / 2, 3) * density;
  const kineticEnergy = 0.5 * mass * Math.pow(velocity, 2); // Joules
  const energyTNT = kineticEnergy / 4.184e9; // 1 ton TNT = 4.184e9 J

  // Equivalent volcanic eruption scale (Mt TNT compared to Krakatoa ~200 Mt)
  const volcanoEquivalent = energyTNT / 200e6;

  // Crater diameter using Holsapple & Schmidt scaling laws (returns km)
  const craterDiameter = calculateCraterDiameter(diameter, density, velocity, angle) / 1000; // convert m -> km

  // Blast radius for severe damage (very approximate scaling laws)
  const severeDamageRadius = 2.0 * Math.pow(energyTNT, 0.33); // km
  const thirdDegreeBurnRadius = 3.0 * Math.pow(energyTNT / 1e6, 0.25); // km
  const secondDegreeBurnRadius = 2.0 * Math.pow(energyTNT / 1e6, 0.25); // km
  const noiseDamageRadius = 10.0 * Math.pow(energyTNT / 1e3, 0.25); // km

  // Atmospheric effects (heuristics from Tunguska/Chicxulub studies)
  // Convert tons TNT to megatons for the estimator
  const ozoneDepletionPercent = estimateOzoneDepletion(energyTNT / 1e6);
  const acidRainSeverity = kineticEnergy > 1e18 ? "Severe acid rain likely (global)" : "Localized acid rain possible";

  // Climate impacts
  let climateImpact;
  if (energyTNT < 1e6) {
    climateImpact = "Negligible global climate impact";
  } else if (energyTNT < 1e9) {
    climateImpact = "Regional cooling ('mini impact winter')";
  } else {
    climateImpact = "Global impact winter (years of cooling) followed by greenhouse warming";
  }

  return {
    mass,
    kineticEnergy,
    energyTNT,
    volcanoEquivalent,
    craterDiameter,
    severeDamageRadius,
    thirdDegreeBurnRadius,
    secondDegreeBurnRadius,
    noiseDamageRadius,
    ozoneDepletionPercent,
    acidRainSeverity,
    climateImpact,
  };
}