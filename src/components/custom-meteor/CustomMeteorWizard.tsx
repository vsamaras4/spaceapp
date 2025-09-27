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
import { ANGLE, DEFAULT_STATE, DIAMETER, VELOCITY,
         type MeteorState, type WizardStep,
         clamp, prettyNumber, round } from "@/lib/meteor";

interface CustomMeteorWizardProps {
  onComplete?: (meteor: MeteorState) => void;
}

export default function CustomMeteorWizard({ onComplete }: CustomMeteorWizardProps) {
  const [state, setState] = useState<MeteorState>(DEFAULT_STATE);
  const [step, setStep] = useState<WizardStep>(0);

  const nextStep = () => {
    if (step < 3) {
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
            <CardTitle>Step {step + 1} of 4</CardTitle>
            <Progress value={(step + 1) * 25} className="w-full" />
          </CardHeader>
          <CardContent>
            {step === 0 && <DiameterStep state={state} setState={setState} />}
            {step === 1 && <VelocityStep state={state} setState={setState} />}
            {step === 2 && <AngleStep state={state} setState={setState} />}
            {step === 3 && <ReviewStep state={state} />}
            
            <Hints step={step} />
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={prevStep} disabled={step === 0}>
                Previous
              </Button>
              <Button onClick={nextStep}>
                {step === 3 ? "Create Meteor" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <MeteorVisualization state={state} step={step} />
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


function ReviewStep({ state }: { state: MeteorState }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your custom meteor settings before proceeding.</p>
      <div className="grid gap-3">
        <ReviewRow label="Diameter" value={`${prettyNumber(state.diameter_m)} m`} />
        <ReviewRow label="Velocity" value={`${round(state.velocity_kms, 1)} km/s`} />
        <ReviewRow label="Impact Angle" value={`${round(state.angle_deg)}°`} />
      </div>
      <p className="text-xs text-muted-foreground">On the next screen, your existing Impact & Info flow runs unchanged.</p>
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
      {step === 3 && <p>Ready to hand off to Impact & Info.</p>}
    </div>
  );
}