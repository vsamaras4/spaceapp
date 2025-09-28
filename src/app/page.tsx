"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomMeteorWizard from "@/components/custom-meteor/CustomMeteorWizard";
import { MeteorVisualization } from "@/components/custom-meteor/MeteorVisualization";
import { ANGLE, DIAMETER, VELOCITY, clamp, type MeteorState } from "@/lib/meteor";

type AppView = "home" | "existing" | "custom" | "analysis";

const EXISTING_METEORS = [
  {
    id: "chicxulub",
    name: "Chicxulub Impactor",
    diameter: 10000,
    velocity: 20,
    angle: 60,
    description: "The asteroid that caused the Cretaceous-Paleogene extinction event, wiping out the dinosaurs.",
    impactYear: "66 million years ago",
    location: "Yucatán Peninsula, Mexico"
  },
  {
    id: "tunguska",
    name: "Tunguska Event",
    diameter: 50,
    velocity: 15,
    angle: 30,
    description: "A massive explosion over Siberia that flattened 2,000 square kilometers of forest.",
    impactYear: "1908",
    location: "Tunguska, Siberia"
  },
  {
    id: "chelyabinsk",
    name: "Chelyabinsk Meteor",
    diameter: 20,
    velocity: 19,
    angle: 18,
    description: "A superbolide that exploded over Russia, injuring over 1,000 people.",
    impactYear: "2013",
    location: "Chelyabinsk, Russia"
  },
  {
    id: "barringer",
    name: "Barringer Crater",
    diameter: 50,
    velocity: 12,
    angle: 45,
    description: "A well-preserved meteor crater in Arizona, created by an iron meteorite.",
    impactYear: "50,000 years ago",
    location: "Arizona, USA"
  }
];

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>("home");
  const [selectedMeteor, setSelectedMeteor] = useState<MeteorState | null>(null);
  const [previousView, setPreviousView] = useState<AppView>("home");

  const updateMeteor = (updater: (prev: MeteorState) => MeteorState) => {
    setSelectedMeteor((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  const handleDiameterChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    updateMeteor((prev) => ({
      ...prev,
      diameter_m: clamp(parsed, DIAMETER.min, DIAMETER.max)
    }));
  };

  const handleVelocityChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    updateMeteor((prev) => ({
      ...prev,
      velocity_kms: clamp(parsed, VELOCITY.min, VELOCITY.max)
    }));
  };

  const handleAngleChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    updateMeteor((prev) => ({
      ...prev,
      angle_deg: clamp(parsed, ANGLE.min, ANGLE.max)
    }));
  };

  const handleLocationSelect = (x: number, y: number) => {
    updateMeteor((prev) => ({
      ...prev,
      impactLocation: { x, y }
    }));
  };

  const handleExistingMeteorSelect = (meteor: typeof EXISTING_METEORS[0]) => {
    setSelectedMeteor({
      diameter_m: meteor.diameter,
      velocity_kms: meteor.velocity,
      angle_deg: meteor.angle
    });
    setPreviousView("existing");
    setCurrentView("analysis");
  };

  const handleCustomMeteorComplete = (meteor: MeteorState) => {
    setSelectedMeteor(meteor);
    setPreviousView("custom");
    setCurrentView("analysis");
  };

  const goHome = () => {
    setCurrentView("home");
    setSelectedMeteor(null);
    setPreviousView("home");
  };

  const goBack = () => {
    if (currentView === "analysis") {
      setCurrentView(previousView);
    } else if (currentView === "custom") {
      setCurrentView("home");
    } else if (currentView === "existing") {
      setCurrentView("home");
    }
  };

  // Home View
  if (currentView === "home") {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Space Rock Impact Simulator</h1>
          <p className="text-xl text-muted-foreground">Choose how you'd like to explore meteor impacts</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Existing Meteor Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🌟 Existing Meteor
              </CardTitle>
              <CardDescription>
                Use predefined meteor data from real historical impacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Explore famous meteors like the Chicxulub impactor, Tunguska event, and more. 
                See how these real meteors would affect different locations.
              </p>
              <Button onClick={() => setCurrentView("existing")} className="w-full">
                Choose Existing Meteor
              </Button>
            </CardContent>
          </Card>

          {/* Custom Meteor Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🛠️ Custom Meteor
              </CardTitle>
              <CardDescription>
                Create your own meteor with custom parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Design your own meteor by setting diameter, velocity, and impact angle. 
                Perfect for experimenting with different scenarios.
              </p>
              <Button onClick={() => setCurrentView("custom")} className="w-full">
                Create Custom Meteor
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Both options will lead you through our Impact & Info analysis flow
          </p>
        </div>
      </main>
    );
  }

  // Existing Meteors Selection View
  if (currentView === "existing") {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={goBack}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">Choose an Existing Meteor</h1>
          </div>
          <p className="text-muted-foreground">
            Select from famous historical meteor impacts to see their effects.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {EXISTING_METEORS.map((meteor) => (
            <Card key={meteor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ☄️ {meteor.name}
                </CardTitle>
                <CardDescription>
                  {meteor.impactYear} • {meteor.location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {meteor.description}
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <div className="font-medium">Diameter</div>
                    <div className="text-muted-foreground">{meteor.diameter}m</div>
                  </div>
                  <div>
                    <div className="font-medium">Velocity</div>
                    <div className="text-muted-foreground">{meteor.velocity} km/s</div>
                  </div>
                  <div>
                    <div className="font-medium">Angle</div>
                    <div className="text-muted-foreground">{meteor.angle}°</div>
                  </div>
                </div>

                <Button onClick={() => handleExistingMeteorSelect(meteor)} className="w-full">
                  Analyze This Meteor
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Each meteor will be analyzed using our Impact & Info system
          </p>
        </div>
      </main>
    );
  }

  // Custom Meteor Creation View
  if (currentView === "custom") {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={goBack}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">Create a Custom Meteor</h1>
          </div>
          <p className="text-muted-foreground">
            Step-by-step setup. Final Impact & Info remains unchanged.
          </p>
        </div>
        <CustomMeteorWizard onComplete={handleCustomMeteorComplete} />
      </main>
    );
  }

  // Analysis View
  if (currentView === "analysis" && selectedMeteor) {
    const locationLabel = selectedMeteor.impactLocation
      ? `(${Math.round(selectedMeteor.impactLocation.x)}, ${Math.round(selectedMeteor.impactLocation.y)})`
      : "Not selected";

    return (
      <main className="container mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={goBack}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">Meteor Impact Analysis</h1>
          </div>
          <p className="text-muted-foreground">
            Adjust your meteor parameters or refine the impact site, then review the analysis details.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Impact Summary</CardTitle>
                <CardDescription>Match the wizard&apos;s final step with quick adjustments.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <SummaryRow label="Impact Location">
                    <span className="font-medium">{locationLabel}</span>
                  </SummaryRow>
                  <SummaryRow label="Meteor Diameter">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={selectedMeteor.diameter_m}
                      onChange={(event) => handleDiameterChange(event.target.value)}
                      className="w-28 text-right"
                      min={DIAMETER.min}
                      max={DIAMETER.max}
                    />
                    <span className="text-muted-foreground">m</span>
                  </SummaryRow>
                  <SummaryRow label="Impact Velocity">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={selectedMeteor.velocity_kms}
                      onChange={(event) => handleVelocityChange(event.target.value)}
                      className="w-28 text-right"
                      min={VELOCITY.min}
                      max={VELOCITY.max}
                      step={0.1}
                    />
                    <span className="text-muted-foreground">km/s</span>
                  </SummaryRow>
                  <SummaryRow label="Impact Angle">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={selectedMeteor.angle_deg}
                      onChange={(event) => handleAngleChange(event.target.value)}
                      className="w-28 text-right"
                      min={ANGLE.min}
                      max={ANGLE.max}
                    />
                    <span className="text-muted-foreground">°</span>
                  </SummaryRow>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Tip: Click the map to adjust the impact location. Parameters update the visualization immediately.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This is where your Impact &amp; Info analysis would go. The meteor visualization shows your configured
                  parameters and selected impact point.
                </p>
                <div className="mt-4">
                  <Button onClick={goHome} className="w-full">
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <MeteorVisualization
              state={selectedMeteor}
              step={4}
              onLocationSelect={handleLocationSelect}
            />
          </div>
        </div>
      </main>
    );
  }

  return null;
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
