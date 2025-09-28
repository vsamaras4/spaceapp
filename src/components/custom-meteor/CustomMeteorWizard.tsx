// components/custom-meteor/CustomMeteorWizard.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { MeteorVisualization } from "./MeteorVisualization";
import { ANGLE, DEFAULT_STATE, DIAMETER, VELOCITY, DENSITY,
         type MeteorState, type WizardStep, type ImpactInputs, type ImpactResults,
         clamp, prettyNumber, round, calculateImpact } from "@/lib/meteor";

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
      // Final step - complete the wizard
      onComplete(state);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep((step - 1) as WizardStep);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step {step + 1} of 7</CardTitle>
            <Progress value={(step + 1) * (100/7)} className="w-full" />
          </CardHeader>
          <CardContent>
            {step === 0 && <DiameterStep state={state} setState={setState} />}
            {step === 1 && <VelocityStep state={state} setState={setState} />}
            {step === 2 && <AngleStep state={state} setState={setState} />}
            {step === 3 && <DensityStep state={state} setState={setState} />}
            {step === 4 && <ReviewStep state={state} />}
            {step === 5 && <ImpactLocationStep state={state} setState={setState} />}
            {step === 6 && <ImpactResultsStep state={state} />}
            
            <Hints step={step} />
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={prevStep} disabled={step === 0}>
                Previous
              </Button>
              <Button onClick={nextStep}>
                {step === 6 ? "Complete" : step === 5 ? "Calculate Impact" : step === 4 ? "Select Impact Location" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <MeteorVisualization 
          state={state} 
          step={step} 
          onLocationSelect={(x, y) => setState({ ...state, impactLocation: { x, y } })}
        />
      </div>
    </div>
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
      <p className="text-sm text-muted-foreground">
        Set the **diameter** of your meteor in meters (m). Larger meteors create more dramatic impacts.
      </p>
      <div className="space-y-3">
        <Label htmlFor="diameter">Diameter (m)</Label>
        <div className="flex items-center gap-3">
          <Slider 
            value={[value]} 
            onValueChange={onSlide} 
            min={MIN} 
            max={MAX} 
            step={1} 
            className="flex-1" 
          />
          <Input 
            type="number" 
            inputMode="numeric" 
            value={value} 
            onChange={(e) => set(Number(e.target.value || 0))} 
            className="w-28" 
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>min</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(DIAMETER.avg)}>avg</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>max</Button>
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
      <p className="text-sm text-muted-foreground">
        Set the **velocity** of your meteor in km/s. Higher velocities create more energetic impacts.
      </p>
      <div className="space-y-3">
        <Label htmlFor="velocity">Velocity (km/s)</Label>
        <div className="flex items-center gap-3">
          <Slider 
            value={[value]} 
            onValueChange={onSlide} 
            min={MIN} 
            max={MAX} 
            step={1} 
            className="flex-1" 
          />
          <Input 
            type="number" 
            inputMode="numeric" 
            value={value} 
            onChange={(e) => set(Number(e.target.value || 0))} 
            className="w-28" 
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>min</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(VELOCITY.avg)}>avg</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>max</Button>
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
      <p className="text-sm text-muted-foreground">
        Set the **impact angle** (degrees from horizontal). 90° is vertical, smaller values are more grazing entries.
      </p>
      <div className="space-y-3">
        <Label htmlFor="angle">Angle (°)</Label>
        <div className="flex items-center gap-3">
          <Slider 
            value={[value]} 
            onValueChange={onSlide} 
            min={MIN} 
            max={MAX} 
            step={1} 
            className="flex-1" 
          />
          <Input 
            type="number" 
            inputMode="numeric" 
            value={value} 
            onChange={(e) => set(Number(e.target.value || 0))} 
            className="w-28" 
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>min</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(ANGLE.avg)}>avg</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>max</Button>
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
      <p className="text-sm text-muted-foreground">
        Set the **density** of your meteor in kg/m³. Higher density meteors (like iron) create more energetic impacts.
      </p>
      <div className="space-y-3">
        <Label htmlFor="density">Density (kg/m³)</Label>
        <div className="flex items-center gap-3">
          <Slider 
            value={[value]} 
            onValueChange={onSlide} 
            min={MIN} 
            max={MAX} 
            step={100} 
            className="flex-1" 
          />
          <Input 
            type="number" 
            inputMode="numeric" 
            value={value} 
            onChange={(e) => set(Number(e.target.value || 0))} 
            className="w-28" 
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MIN)}>ice</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(DENSITY.avg)}>rock</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => set(MAX)}>iron</Button>
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
        <ReviewRow label="Diameter" value={`${prettyNumber(state.diameter_m)} m`} />
        <ReviewRow label="Velocity" value={`${round(state.velocity_kms, 1)} km/s`} />
        <ReviewRow label="Impact Angle" value={`${round(state.angle_deg)}°`} />
        <ReviewRow label="Density" value={`${prettyNumber(state.density_kgm3)} kg/m³`} />
      </div>
      <p className="text-xs text-muted-foreground">Next, select where on Earth your meteor will impact.</p>
    </div>
  );
}

function ImpactLocationStep({ state, setState }: { state: MeteorState; setState: (state: MeteorState) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click on the world map below to select your meteor's impact location. The impact effects will be calculated based on this location.
      </p>
      <div className="text-center text-sm text-muted-foreground">
        <p>Impact location will be selected on the map visualization</p>
      </div>
    </div>
  );
}

function ImpactResultsStep({ state }: { state: MeteorState }) {
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
          <ReviewRow label="Impact Location" value={state.impactLocation ? `(${Math.round(state.impactLocation.x)}, ${Math.round(state.impactLocation.y)})` : "Not selected"} />
          <ReviewRow label="Meteor Diameter" value={`${prettyNumber(state.diameter_m)} m`} />
          <ReviewRow label="Impact Velocity" value={`${round(state.velocity_kms, 1)} km/s`} />
          <ReviewRow label="Impact Angle" value={`${round(state.angle_deg)}°`} />
          <ReviewRow label="Density" value={`${prettyNumber(state.density_kgm3)} kg/m³`} />
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
              <ReviewRow label="Mass" value={`${results.mass.toExponential(2)} kg`} />
              <ReviewRow label="Kinetic Energy" value={`${results.kineticEnergy.toExponential(2)} J`} />
              <ReviewRow label="TNT Equivalent" value={`${results.energyTNT.toExponential(2)} tons TNT`} />
              <ReviewRow label="Volcano Equivalent" value={`${results.volcanoEquivalent.toFixed(2)} × Krakatoa`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crater & Damage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ReviewRow label="Crater Diameter" value={`${results.craterDiameter.toFixed(2)} km`} />
              <ReviewRow label="Severe Damage Radius" value={`${results.severeDamageRadius.toFixed(2)} km`} />
              <ReviewRow label="3rd Degree Burn Radius" value={`${results.thirdDegreeBurnRadius.toFixed(2)} km`} />
              <ReviewRow label="2nd Degree Burn Radius" value={`${results.secondDegreeBurnRadius.toFixed(2)} km`} />
              <ReviewRow label="Noise Damage Radius" value={`${results.noiseDamageRadius.toFixed(2)} km`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Environmental Effects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ReviewRow label="Ozone Depletion" value={`~${results.ozoneDepletionPercent.toFixed(1)}%`} />
              <ReviewRow label="Acid Rain" value={results.acidRainSeverity} />
              <ReviewRow label="Climate Impact" value={results.climateImpact} />
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          🔬 Educational note: These values are approximate, based on scaling laws from 
          NASA, USGS, and peer-reviewed studies of Chicxulub, Tunguska, and Chelyabinsk events.
        </p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Hints({ step }: { step: WizardStep }) {
  return (
    <div className="mt-4 text-xs text-muted-foreground">
      {step === 0 && <p>Tip: you can click min/avg/max to quickly test edge cases.</p>}
      {step === 1 && <p>Tip: velocity increases tail length in the viz—purely illustrative.</p>}
      {step === 2 && <p>Tip: angle rotates the approach vector; ground appears only on this step.</p>}
      {step === 3 && <p>Tip: density affects impact energy—ice is lighter, iron is denser.</p>}
      {step === 4 && <p>Ready to select impact location on the world map.</p>}
      {step === 5 && <p>Click anywhere on the world map to select your impact location.</p>}
      {step === 6 && <p>Impact simulation complete! The meteor has reached its destination.</p>}
    </div>
  );
}