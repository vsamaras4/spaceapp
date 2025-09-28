// lib/meteor.ts
export type GeoLocation = {
  lat: number;
  lng: number;
};

export type MeteorState = {
  diameter_m: number;   // meters
  velocity_kms: number; // km/s (UI)
  angle_deg: number;    // degrees from horizontal
  density_kgm3: number; // kg/m³
  impactLocation?: GeoLocation; // impact location on world map (lat/lng)
};

export type ImpactInputs = {
  diameter: number;   // meters
  density: number;    // kg/m³
  velocity: number;   // m/s  <-- IMPORTANT: calculation expects m/s
  angle: number;      // degrees from horizontal
};

export type ImpactResults = {
  mass: number;                  // kg
  kineticEnergy: number;         // J
  energyTNT: number;             // tons TNT
  volcanoEquivalent: number;     // Krakatoa ≈ 200 Mt
  craterDiameter: number;        // km
  severeDamageRadius: number;    // km (≈ 5 psi)
  thirdDegreeBurnRadius: number; // km
  secondDegreeBurnRadius: number;// km
  noiseDamageRadius: number;     // km (window break)
  ozoneDepletionPercent: number; // %
  acidRainSeverity: string;
  climateImpact: string;
};

export const DIAMETER = {
  min: 10,     // ~small building-sized meteoroid (placeholder UI range)
  avg: 100,    // convenient mid reference for UI
  max: 10000,  // ~10 km (Chicxulub-scale); prototype upper bound
};

export const VELOCITY = {
  min: 12,  // km/s (approx lower-bound atmospheric entry)
  avg: 20,  // km/s (common reference)
  max: 72,  // km/s (upper-ish bound)
};

export const ANGLE = {
  min: 5,   // deg (very shallow)
  avg: 45,  // deg (often used in models)
  max: 90,  // deg (vertical)
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
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

export function formatScientificWithLabel(n: number, digits = 2) {
  if (!isFinite(n)) return "—";

  const scientific = n.toExponential(digits);
  const absValue = Math.abs(n);

  const scales = [
    { value: 1e21, label: "sextillion" },
    { value: 1e18, label: "quintillion" },
    { value: 1e15, label: "quadrillion" },
    { value: 1e12, label: "trillion" },
    { value: 1e9, label: "billion" },
    { value: 1e6, label: "million" },
  ];

  for (const { value, label } of scales) {
    if (absValue >= value) {
      const scaled = n / value;
      const formatted = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2,
      }).format(scaled);

      return `${scientific} (${formatted} ${label})`;
    }
  }

  return scientific;
}

/**
 * Ozone depletion estimator (percent), input in **megaton (Mt)** TNT equivalent.
 * Smooth monotonic scaling that saturates at ~50% for extreme Chicxulub-class events.
 * Intent: small to moderate impacts produce small global depletion; very large can reach tens of percent.
 */
export function estimateOzoneDepletion(energyMT: number) {
  if (!isFinite(energyMT) || energyMT <= 0) return 0;
  // Empirical monotone curve ~ W^0.25 with cap at 50%
  // 1 Mt -> ~5%, 100 Mt -> ~15%, 1,000 Mt -> ~28%, 1e6 Mt -> ~50% (cap)
  const pct = 5 * Math.pow(energyMT, 0.25);
  return clamp(pct, 0, 50);
}

// Crater diameter calculation using Holsapple & Schmidt-style scaling laws
export function calculateCraterDiameter(
  diameter: number,      // impactor diameter (m)
  density: number,       // impactor density (kg/m³)
  velocity: number,      // impact velocity (m/s)
  angle: number,         // impact angle (degrees from horizontal)
  targetDensity = 2700,  // target density (Earth crust, kg/m³)
  gravity = 9.81         // Earth surface gravity (m/s²)
): number {
  // Convert angle to radians; avoid sin(0) → 0 with a tiny floor
  const theta = (clamp(angle, 0.1, 90) * Math.PI) / 180;

  // Constants from rock-like targets
  const mu = 0.22;   // material constant
  const k1 = 1.161;  // scaling coefficient (empirical)

  const r = Math.max(0, diameter / 2);

  const transientCrater =
    k1 *
    Math.pow(gravity, -mu) *
    Math.pow(density / targetDensity, 1 / 3) *
    Math.pow(r, 1 - mu) *
    Math.pow(velocity, 2 * mu) *
    Math.pow(Math.sin(theta), 1 / 3);

  // Final crater correction factor (collapse widens it).
  const correctionFactor = 1.3;

  const finalCrater = transientCrater * correctionFactor;

  // Return meters
  return Math.max(0, finalCrater);
}

/**
 * Utility: convert km/s (UI) -> m/s (physics)
 */
export function kmsToMs(v_kms: number) {
  return v_kms * 1000;
}

// Core impact model
// Based on standard energetics + simple blast/thermal scaling relations.
// NOTE: velocity is expected in m/s here (ImpactInputs.velocity).
export function calculateImpact(inputs: ImpactInputs): ImpactResults {
  const { diameter, density, velocity, angle } = inputs;

  // Mass & energy
  const radius = Math.max(0, diameter / 2);
  const mass = (4 / 3) * Math.PI * Math.pow(radius, 3) * density; // kg
  const kineticEnergy = 0.5 * mass * Math.pow(velocity, 2);        // J

  // TNT conversions
  // 1 ton TNT = 4.184e9 J
  const energyTNT = kineticEnergy / 4.184e9; // tons
  const E_tons = Math.max(0, energyTNT);
  const E_kt = E_tons / 1e3; // kilotons
  const E_Mt = E_tons / 1e6; // megatons

  // Equivalent volcanic eruption scale (Krakatoa ~200 Mt)
  const volcanoEquivalent = E_Mt / 200;

  // Crater diameter (m -> km)
  const craterDiameter = calculateCraterDiameter(diameter, density, velocity, angle) / 1000;

  // ===========================
  // FIXED: Consistent yield units + correct severity ordering
  // ===========================
  // - Blast severe damage (~5 psi) ~ W^(1/3) with W in Mt
  // - Thermal radii ~ W^0.4 with W in Mt, and ensure 2nd-degree > 3rd-degree
  // - Noise / window break ~ W^(1/4) with W in kt
  const severeDamageRadius = 4.5 * Math.pow(E_Mt, 1 / 3);        // km
  const thirdDegreeBurnRadius = 8.0 * Math.pow(E_Mt, 0.40);      // km
  let secondDegreeBurnRadius = 13.0 * Math.pow(E_Mt, 0.40);      // km

  // Guard against accidental inversion after any future constant tweaks
  if (secondDegreeBurnRadius < thirdDegreeBurnRadius) {
    secondDegreeBurnRadius = thirdDegreeBurnRadius * 1.1;
  }

  const noiseDamageRadius = 15.0 * Math.pow(E_kt, 0.25);         // km

  // Atmospheric effects
  // Pass **megaton** to estimator
  const ozoneDepletionPercent = estimateOzoneDepletion(E_Mt);

  const acidRainSeverity =
    kineticEnergy >= 1e18
      ? "Severe acid rain likely (global)"
      : kineticEnergy >= 1e16
      ? "Regional acid rain possible"
      : "Localized acid rain possible";

  // Climate impacts (very coarse heuristic on total yield)
  let climateImpact: string;
  if (E_Mt < 1) {
    climateImpact = "Negligible global climate impact";
  } else if (E_Mt < 1000) {
    climateImpact = "Regional cooling ('mini impact winter')";
  } else {
    climateImpact = "Global impact winter (years of cooling) followed by greenhouse warming";
  }

  // Ensure non-negative outputs
  const safe = (x: number) => (isFinite(x) && x > 0 ? x : 0);

  return {
    mass: safe(mass),
    kineticEnergy: safe(kineticEnergy),
    energyTNT: safe(E_tons),
    volcanoEquivalent: safe(volcanoEquivalent),
    craterDiameter: safe(craterDiameter),
    severeDamageRadius: safe(severeDamageRadius),
    thirdDegreeBurnRadius: safe(thirdDegreeBurnRadius),
    secondDegreeBurnRadius: safe(secondDegreeBurnRadius),
    noiseDamageRadius: safe(noiseDamageRadius),
    ozoneDepletionPercent: clamp(ozoneDepletionPercent, 0, 100),
    acidRainSeverity,
    climateImpact,
  };
}
