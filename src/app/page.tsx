"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import CustomMeteorWizard, { ImpactResultsStep } from "@/components/custom-meteor/CustomMeteorWizard";
import { MeteorVisualization } from "@/components/custom-meteor/MeteorVisualization";
import { type MeteorState } from "@/lib/meteor";

type AppView = "home" | "existing" | "custom" | "analysis";

type MeteorOption = {
  id: string;
  name: string;
  diameter: number;
  velocity: number;
  angle: number;
  density: number;
  description: string;
  impactYear?: string;
  location?: string;
  coords?: { lat: number; lng: number };
};

const HISTORICAL_METEORS: MeteorOption[] = [
  {
    id: "chicxulub",
    name: "Chicxulub Impactor",
    diameter: 10000,
    velocity: 20,
    angle: 60,
    density: 3000,
    description: "The asteroid that caused the Cretaceous-Paleogene extinction event, wiping out the dinosaurs.",
    impactYear: "66 million years ago",
    location: "Yucatán Peninsula, Mexico",
    coords: { lat: 21.4, lng: -89.5 }
  },
  {
    id: "tunguska",
    name: "Tunguska Event",
    diameter: 50,
    velocity: 15,
    angle: 30,
    density: 1000,
    description: "A massive explosion over Siberia that flattened 2,000 square kilometers of forest.",
    impactYear: "1908",
    location: "Tunguska, Siberia",
    coords: { lat: 60.9, lng: 101.9 }
  },
  {
    id: "chelyabinsk",
    name: "Chelyabinsk Meteor",
    diameter: 20,
    velocity: 19,
    angle: 18,
    density: 3000,
    description: "A superbolide that exploded over Russia, injuring over 1,000 people.",
    impactYear: "2013",
    location: "Chelyabinsk, Russia",
    coords: { lat: 55.16, lng: 61.40 }
  },
  {
    id: "barringer",
    name: "Barringer Crater",
    diameter: 50,
    velocity: 12,
    angle: 45,
    density: 8000,
    description: "A well-preserved meteor crater in Arizona, created by an iron meteorite.",
    impactYear: "50,000 years ago",
    location: "Arizona, USA",
    coords: { lat: 35.027, lng: -111.022 }
  }
];

const NEAR_EARTH_OBJECTS: MeteorOption[] = [
  {
    id: "athanasia",
    name: "730 Athanasia (A912 GG)",
    diameter: 4497,
    velocity: 14,
    angle: 20,
    density: 3000,
    description:
      "",
  },
  {
    id: "toro",
    name: "1685 Toro (1948 OA)",
    diameter: 3400,
    velocity: 20,
    angle: 25,
    density: 3000,
    description:
      "",
  }  
];

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>("home");
  const [selectedMeteor, setSelectedMeteor] = useState<MeteorState | null>(null);
  const [previousView, setPreviousView] = useState<AppView>("home");
  const [forceImpactEffects, setForceImpactEffects] = useState(false);

  const updateMeteor = (updater: (prev: MeteorState) => MeteorState) => {
    setSelectedMeteor((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  const handleLocationSelect = (lng: number, lat: number) => {
    updateMeteor((prev) => ({
      ...prev,
      impactLocation: { lng, lat }
    }));
  };

  const handleExistingMeteorSelect = (meteor: MeteorOption) => {
    setSelectedMeteor({
      diameter_m: meteor.diameter,
      velocity_kms: meteor.velocity,
      angle_deg: meteor.angle,
      density_kgm3: meteor.density,
      impactLocation: meteor.coords
    });
    setPreviousView("existing");
    setForceImpactEffects(true);
    setCurrentView("analysis");
  };

  const handleCustomMeteorComplete = (meteor: MeteorState) => {
    setSelectedMeteor(meteor);
    setPreviousView("custom");
    setForceImpactEffects(false);
    setCurrentView("analysis");
  };

  const goHome = () => {
    setCurrentView("home");
    setSelectedMeteor(null);
    setPreviousView("home");
    setForceImpactEffects(false);
  };

  const goBack = () => {
    if (currentView === "analysis") {
      setForceImpactEffects(false);
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
                Use predefined meteor data from real historical impacts and monitored near-Earth objects
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
            Explore legendary impacts from Earth's past or experiment with monitored asteroids and comets that astronomers
            are watching today.
          </p>
        </div>

        <section className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold mb-4">Historical Impact Events</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {HISTORICAL_METEORS.map((meteor) => (
                <Card key={meteor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ☄️ {meteor.name}
                    </CardTitle>
                    {(meteor.impactYear || meteor.location) && (
                      <CardDescription>
                        {[meteor.impactYear, meteor.location].filter(Boolean).join(" • ")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {meteor.description}
                    </p>

                    <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
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
                      <div>
                        <div className="font-medium">Density</div>
                        <div className="text-muted-foreground">{meteor.density} kg/m³</div>
                      </div>
                    </div>

                    <Button onClick={() => handleExistingMeteorSelect(meteor)} className="w-full">
                      Analyze This Meteor
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Monitored Near-Earth Objects</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
              These asteroids and comets are currently tracked by planetary defense teams. Diameter and density values are
              monitored measurements, while velocity and angle are example entry conditions used for modeling.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {NEAR_EARTH_OBJECTS.map((object) => (
                <Card key={object.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🛰️ {object.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {object.description}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <div className="font-medium">Diameter</div>
                        <div className="text-muted-foreground">{object.diameter}m</div>
                      </div>
                      <div>
                        <div className="font-medium">Density</div>
                        <div className="text-muted-foreground">{object.density} kg/m³</div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium">Example Entry</div>
                        <div className="text-muted-foreground">Velocity: {object.velocity} km/s</div>
                        <div className="text-muted-foreground">Angle: {object.angle}°</div>
                      </div>
                    </div>

                    <Button onClick={() => handleExistingMeteorSelect(object)} className="w-full">
                      Analyze This Object
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Each selection will be analyzed using our Impact & Info system
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
    const shouldForceImpactEffects = forceImpactEffects && Boolean(selectedMeteor.impactLocation);
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={goBack}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">Meteor Impact Results</h1>
          </div>
          <p className="text-muted-foreground">
            You&apos;re now viewing the final step of the custom meteor wizard, showcasing the full destruction radii for this impact.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Step 7 of 7</CardTitle>
              <CardDescription>Review the calculated impact effects for this meteor.</CardDescription>
              <Progress value={100} className="w-full" />
            </CardHeader>
            <CardContent>
              <ImpactResultsStep state={selectedMeteor} />
              <div className="mt-6 flex justify-end">
                <Button onClick={goHome}>Start Over</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <MeteorVisualization
              state={selectedMeteor}
              step={6}
              onLocationSelect={handleLocationSelect}
              showImpactEffects={shouldForceImpactEffects}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Click the map to adjust the impact location and instantly update the destruction radii.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
