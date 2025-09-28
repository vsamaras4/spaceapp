// components/custom-meteor/CustomMeteorWizard.tsx
"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MeteorVisualization } from "./MeteorVisualization";
import {
  ANGLE,
  DEFAULT_STATE,
  DIAMETER,
  VELOCITY,
  DENSITY,
  clamp,
  prettyNumber,
  round,
  type MeteorState,
  type WizardStep,
  type ImpactInputs,
  calculateImpact
} from "@/lib/meteor";

interface CustomMeteorWizardProps {
  onComplete?: (meteor: MeteorState) => void;
}

export default function CustomMeteorWizard({ onComplete }: CustomMeteorWizardProps) {
  const [state, setState] = useState<MeteorState>(DEFAULT_STATE);
  const [step, setStep] = useState<WizardStep>(0);

  const nextStep = () => {
    if (step < 6) {
      setStep((step + 1) as WizardStep);
    } else if (onComplete) {
      onComplete(state);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep((step - 1) as WizardStep);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step {step + 1} of 7</CardTitle>
              <Progress value={(step + 1) * (100 / 7)} className="w-full" />
            </CardHeader>
            <CardContent>
              {step === 0 && <DiameterStep state={state} setState={setState} />}
              {step === 1 && <VelocityStep state={state} setState={setState} />}
              {step === 2 && <AngleStep state={state} setState={setState} />}
              {step === 3 && <DensityStep state={state} setState={setState} />}
              {step === 4 && <ReviewStep state={state} />}
              {step === 5 && <ImpactLocationStep />}
              {step === 6 && <ImpactResultsStep state={state} />}

              <Hints step={step} />

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={prevStep} disabled={step === 0}>
                  Previous
                </Button>
                <Button onClick={nextStep}>
                  {step === 6
                    ? "Complete"
                    : step === 5
                    ? "Calculate Impact"
                    : step === 4
                    ? "Select Impact Location"
                    : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <MeteorVisualization
            state={state}
            step={step}
            onLocationSelect={(lng, lat) => setState({ ...state, impactLocation: { lng, lat } })}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function DiameterStep({ state, setState }: { state: MeteorState; setState: (state: MeteorState) => void }) {
  const value = state.diameter_m;
  const MIN = DIAMETER.min;
  const MAX = DIAMETER.max;

  const set = (v: number) => setState({ ...state, diameter_m: clamp(v, MIN, MAX) });
  const onSlide = (vals: number[]) => set(round(vals[0]));

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Set the <strong>diameter</strong> of your meteor in meters (m). Larger meteors create more dramatic impacts.
        </p>
        <div className="rounded-lg bg-blue-50 p-4 text-sm">
          <h4 className="mb-2 font-semibold text-blue-900">📏 Educational: Diameter & Mass Scaling</h4>
          <p className="mb-2 text-blue-800">
            The diameter determines the volume and mass of the meteor for a given density. Mass scales with the cube of the radius:
          </p>
          <p className="mb-2 font-mono text-xs text-blue-700">m = (4/3)π(d/2)³ρ</p>
          <p className="text-blue-800">
            <strong>Key insight:</strong> Even a tiny meteor can release enormous energy due to cubic scaling. A meteor only twice as wide
            releases about 8 times more energy if velocity and density are the same.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <Label htmlFor="diameter">Diameter (m)</Label>
        <div className="flex items-center gap-3">
          <Slider value={[value]} onValueChange={onSlide} min={MIN} max={MAX} step={1} className="flex-1" />
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => set(Number(e.target.value || 0))}
            className="w-28"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>
            min
          </Button>
          {/* <Button type="button" variant="secondary" size="sm" onClick={() => set(DIAMETER.avg)}>avg</Button> */}
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>
            max
          </Button>
        </div>
      </div>
    </div>
  );
}

function VelocityStep({ state, setState }: { state: MeteorState; setState: (state: MeteorState) => void }) {
  const value = state.velocity_kms;
  const MIN = VELOCITY.min;
  const MAX = VELOCITY.max;

  const set = (v: number) => setState({ ...state, velocity_kms: clamp(v, MIN, MAX) });
  const onSlide = (vals: number[]) => set(round(vals[0]));

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Set the <strong>velocity</strong> of your meteor in km/s. Higher velocities create more energetic impacts.
        </p>
        <div className="rounded-lg bg-green-50 p-4 text-sm">
          <h4 className="mb-2 font-semibold text-green-900">🚀 Educational: Velocity & Kinetic Energy</h4>
          <p className="mb-2 text-green-800">
            Velocity is the speed of the meteor relative to Earth, not just its absolute speed in space. Impact energy scales as the square
            of velocity:
          </p>
          <p className="mb-2 font-mono text-xs text-green-700">E = (1/2)mv²</p>
          <p className="text-green-800">
            <strong>Key insight:</strong> A fast-moving small meteor can sometimes release more energy than a slow-moving much larger one.
            The relative velocity is critical—approaching Earth head-on vs catching up from behind makes a big difference.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <Label htmlFor="velocity">Velocity (km/s)</Label>
        <div className="flex items-center gap-3">
          <Slider value={[value]} onValueChange={onSlide} min={MIN} max={MAX} step={1} className="flex-1" />
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => set(Number(e.target.value || 0))}
            className="w-28"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>
            min
          </Button>
          {/* <Button type="button" variant="secondary" size="sm" onClick={() => set(VELOCITY.avg)}>avg</Button> */}
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>
            max
          </Button>
        </div>
      </div>
    </div>
  );
}

function AngleStep({ state, setState }: { state: MeteorState; setState: (state: MeteorState) => void }) {
  const value = state.angle_deg;
  const MIN = ANGLE.min;
  const MAX = ANGLE.max;

  const set = (v: number) => setState({ ...state, angle_deg: clamp(v, MIN, MAX) });
  const onSlide = (vals: number[]) => set(round(vals[0]));

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Set the <strong>impact angle</strong> (degrees from horizontal). 90° is vertical, smaller values are more grazing entries.
        </p>
        <div className="rounded-lg bg-orange-50 p-4 text-sm">
          <h4 className="mb-2 font-semibold text-orange-900">📐 Educational: Impact Angle & Crater Formation</h4>
          <p className="mb-2 text-orange-800">
            The angle is measured from the horizontal surface of Earth. Different angles produce different crater shapes and energy
            distribution:
          </p>
          <ul className="ml-4 space-y-1 text-xs text-orange-800">
            <li>• <strong>Vertical impacts (near 90°):</strong> Produce deep, circular craters and concentrate energy downward</li>
            <li>• <strong>Shallow impacts (small angles):</strong> Spread energy over a larger area and produce elongated craters</li>
          </ul>
          <p className="mt-2 text-orange-800">
            <strong>Key insight:</strong> Most meteors strike Earth at ~45° on average, which is statistically the most probable angle and
            also produces the largest craters for a given energy.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <Label htmlFor="angle">Angle (°)</Label>
        <div className="flex items-center gap-3">
          <Slider value={[value]} onValueChange={onSlide} min={MIN} max={MAX} step={1} className="flex-1" />
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => set(Number(e.target.value || 0))}
            className="w-28"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>
            min
          </Button>
          {/* <Button type="button" variant="secondary" size="sm" onClick={() => set(ANGLE.avg)}>avg</Button> */}
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>
            max
          </Button>
        </div>
      </div>
    </div>
  );
}

function DensityStep({ state, setState }: { state: MeteorState; setState: (state: MeteorState) => void }) {
  const value = state.density_kgm3;
  const MIN = DENSITY.min;
  const MAX = DENSITY.max;

  const set = (v: number) => setState({ ...state, density_kgm3: clamp(v, MIN, MAX) });
  const onSlide = (vals: number[]) => set(round(vals[0]));

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Set the <strong>density</strong> of your meteor in kg/m³. Higher density meteors (like iron) create more energetic impacts.
        </p>
        <div className="rounded-lg bg-purple-50 p-4 text-sm">
          <h4 className="mb-2 font-semibold text-purple-900">⚗️ Educational: Meteor Composition & Density</h4>
          <p className="mb-2 text-purple-800">Density depends on composition and directly affects mass for a given diameter:</p>
          <ul className="ml-4 space-y-1 text-xs text-purple-800">
            <li>• <strong>Ice or cometary material:</strong> 300–1000 kg/m³</li>
            <li>• <strong>Rock/ordinary chondrite:</strong> 3000–3500 kg/m³</li>
            <li>• <strong>Iron meteorites:</strong> 7000–8000 kg/m³</li>
          </ul>
          <p className="mt-2 text-purple-800">
            <strong>Key insight:</strong> A small dense iron meteor can punch a bigger hole than a much larger icy meteor because of the
            mass difference. Higher density means more mass for the same diameter, which directly increases kinetic energy.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <Label htmlFor="density">Density (kg/m³)</Label>
        <div className="flex items-center gap-3">
          <Slider value={[value]} onValueChange={onSlide} min={MIN} max={MAX} step={100} className="flex-1" />
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => set(Number(e.target.value || 0))}
            className="w-28"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>
            ice
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(DENSITY.avg)}>
            rock
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>
            iron
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ state }: { state: MeteorState }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your custom meteor settings before proceeding.</p>
      <div className="grid gap-3">
        <ReviewRow
          label="Diameter"
          value={`${prettyNumber(state.diameter_m)} m`}
          help="Width across the meteor. Larger diameters increase volume and mass (and thus impact energy)."
        />
        <ReviewRow
          label="Velocity"
          value={`${round(state.velocity_kms, 1)} km/s`}
          help="Speed at impact in kilometers per second. Energy scales with the square of velocity."
        />
        <ReviewRow
          label="Impact Angle"
          value={`${round(state.angle_deg)}°`}
          help="Degrees from horizontal (90° is straight down). Affects crater shape and energy distribution."
        />
        <ReviewRow
          label="Density"
          value={`${prettyNumber(state.density_kgm3)} kg/m³`}
          help="Mass per unit volume. Higher density (e.g., iron) means more mass for the same size."
        />
      </div>
      <p className="text-xs text-muted-foreground">Next, select where on Earth your meteor will impact.</p>
    </div>
  );
}

function ImpactLocationStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click on the world map below to select your meteor&apos;s impact location. The impact effects will be calculated based on this
        location.
      </p>
      <div className="text-center text-sm text-muted-foreground">
        <p>Pick a point on the map, then choose &quot;Calculate Impact&quot; to generate results.</p>
      </div>
    </div>
  );
}

export function ImpactResultsStep({ state }: { state: MeteorState }) {
  const impactInputs: ImpactInputs = {
    diameter: state.diameter_m,
    density: state.density_kgm3,
    velocity: state.velocity_kms * 1000, // Convert km/s to m/s
    angle: state.angle_deg,
  };

  const results = calculateImpact(impactInputs);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Impact simulation complete! Your meteor has impacted the selected location.
        </p>
        <div className="grid gap-3">
          <ReviewRow
            label="Impact Location"
            value={
              state.impactLocation
                ? `${state.impactLocation.lat.toFixed(2)}°, ${state.impactLocation.lng.toFixed(2)}°`
                : "Not selected"
            }
            help="Latitude and longitude of the chosen impact point."
          />
          <ReviewRow
            label="Meteor Diameter"
            value={`${prettyNumber(state.diameter_m)} m`}
            help="Width across the meteor used for volume and mass calculations."
          />
          <ReviewRow
            label="Impact Velocity"
            value={`${round(state.velocity_kms, 1)} km/s`}
            help="Speed at impact; higher velocities greatly increase energy."
          />
          <ReviewRow
            label="Impact Angle"
            value={`${round(state.angle_deg)}°`}
            help="Entry angle relative to the ground. Lower angles spread effects over a wider area."
          />
          <ReviewRow
            label="Density"
            value={`${prettyNumber(state.density_kgm3)} kg/m³`}
            help="Material density (ice/rock/iron). Directly scales mass for a given diameter."
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Impact Analysis Results</h3>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Physics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ReviewRow
                label="Mass"
                value={`${results.mass.toExponential(2)} kg`}
                help="Total mass of the meteor from diameter and density: m = (4/3)·π·(d/2)^3·ρ."
              />
              <ReviewRow
                label="Kinetic Energy"
                value={`${results.kineticEnergy.toExponential(2)} J`}
                help="Energy on impact: E = ½·m·v². Main driver of destructive effects."
              />
              <ReviewRow
                label="TNT Equivalent"
                value={`${results.energyTNT.toExponential(2)} tons TNT`}
                help="Energy expressed as the mass of TNT that would release a similar amount of energy."
              />
              <ReviewRow
                label="Volcano Equivalent"
                value={`${results.volcanoEquivalent.toFixed(2)} × Krakatoa`}
                help="Comparison to the estimated explosive energy of the 1883 Krakatoa eruption."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crater & Damage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ReviewRow
                label="Crater Diameter"
                value={`${results.craterDiameter.toFixed(2)} km`}
                help="Approximate final crater width at the surface after collapse and ejecta deposition."
              />
              <ReviewRow
                label="Severe Damage Radius"
                value={`${results.severeDamageRadius.toFixed(2)} km`}
                help="Area near ground zero with extreme overpressure and thermal effects causing near-total destruction."
              />
              <ReviewRow
                label="3rd Degree Burn Radius"
                value={`${results.thirdDegreeBurnRadius.toFixed(2)} km`}
                help="Region where thermal radiation can cause full-thickness skin burns on exposed tissue."
              />
              <ReviewRow
                label="2nd Degree Burn Radius"
                value={`${results.secondDegreeBurnRadius.toFixed(2)} km`}
                help="Region where thermal radiation can cause partial-thickness burns."
              />
              <ReviewRow
                label="Noise Damage Radius"
                value={`${results.noiseDamageRadius.toFixed(2)} km`}
                help="Approximate area affected by potentially damaging blast/shockwave sound levels."
              />
            </CardContent>
          </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environmental Effects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ReviewRow
              label="Ozone Depletion"
              value={`~${results.ozoneDepletionPercent.toFixed(1)}%`}
              help="Estimated global mean reduction in stratospheric ozone from nitrogen oxides and aerosols."
            />
            <ReviewRow
              label="Acid Rain"
              value={results.acidRainSeverity}
              help="Qualitative estimate of acidification from atmospheric chemistry after the impact."
            />
            <ReviewRow
              label="Climate Impact"
              value={results.climateImpact}
              help="Qualitative assessment of short-to-medium term cooling from dust/aerosols injected into the atmosphere."
            />
          </CardContent>
        </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          🔬 Educational note: These values are approximate, based on scaling laws from NASA, USGS, and peer-reviewed studies of Chicxulub, Tunguska, and Chelyabinsk events.
        </p>
      </div>
    </div>
  );
}

function InfoTooltip({
  content,
  side = "top",
}: {
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold leading-none text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          i
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function ReviewRow({ label, value, help }: { label: string; value: string; help?: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div className="flex items-center text-muted-foreground">
        <span>{label}</span>
        {help ? <InfoTooltip content={help} /> : null}
      </div>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Hints({ step }: { step: WizardStep }) {
  return (
    <div className="mt-4 text-xs text-muted-foreground">
      {/* hint copy intentionally hidden */}
    </div>
  );
}