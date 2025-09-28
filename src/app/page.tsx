"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustomMeteorWizard from "@/components/custom-meteor/CustomMeteorWizard";
import { MeteorVisualization } from "@/components/custom-meteor/MeteorVisualization";
import { DEFAULT_STATE, type MeteorState, type ImpactInputs, type ImpactResults, calculateImpact, prettyNumber, round } from "@/lib/meteor";

type AppView = "home" | "existing" | "custom" | "analysis";

const EXISTING_METEORS = [
  {
    id: "chicxulub",
    name: "Chicxulub Impactor",
    diameter: 10000,
    velocity: 20,
    angle: 60,
    density: 3000,
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
    density: 1000,
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
    density: 3000,
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
    density: 8000,
    description: "A well-preserved meteor crater in Arizona, created by an iron meteorite.",
    impactYear: "50,000 years ago",
    location: "Arizona, USA"
  }
];

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>("home");
  const [selectedMeteor, setSelectedMeteor] = useState<MeteorState | null>(null);
  const [previousView, setPreviousView] = useState<AppView>("home");

  const handleExistingMeteorSelect = (meteor: typeof EXISTING_METEORS[0]) => {
    setSelectedMeteor({
      diameter_m: meteor.diameter,
      velocity_kms: meteor.velocity,
      angle_deg: meteor.angle,
      density_kgm3: meteor.density
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
    const impactInputs: ImpactInputs = {
      diameter: selectedMeteor.diameter_m,
      density: selectedMeteor.density_kgm3,
      velocity: selectedMeteor.velocity_kms * 1000, // Convert km/s to m/s
      angle: selectedMeteor.angle_deg,
    };

    const results = calculateImpact(impactInputs);

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
            Complete impact analysis based on your meteor parameters
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Meteor Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diameter:</span>
                    <span className="font-medium">{selectedMeteor.diameter_m}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Velocity:</span>
                    <span className="font-medium">{selectedMeteor.velocity_kms} km/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impact Angle:</span>
                    <span className="font-medium">{selectedMeteor.angle_deg}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Density:</span>
                    <span className="font-medium">{selectedMeteor.density_kgm3} kg/m³</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Impact Analysis Results</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Physics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mass:</span>
                    <span className="font-medium">{results.mass.toExponential(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kinetic Energy:</span>
                    <span className="font-medium">{results.kineticEnergy.toExponential(2)} J</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TNT Equivalent:</span>
                    <span className="font-medium">{results.energyTNT.toExponential(2)} tons TNT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volcano Equivalent:</span>
                    <span className="font-medium">{results.volcanoEquivalent.toFixed(2)} × Krakatoa</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Crater & Damage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crater Diameter:</span>
                    <span className="font-medium">{results.craterDiameter.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severe Damage Radius:</span>
                    <span className="font-medium">{results.severeDamageRadius.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">3rd Degree Burn Radius:</span>
                    <span className="font-medium">{results.thirdDegreeBurnRadius.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">2nd Degree Burn Radius:</span>
                    <span className="font-medium">{results.secondDegreeBurnRadius.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Noise Damage Radius:</span>
                    <span className="font-medium">{results.noiseDamageRadius.toFixed(2)} km</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Environmental Effects</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ozone Depletion:</span>
                    <span className="font-medium">~{results.ozoneDepletionPercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acid Rain:</span>
                    <span className="font-medium">{results.acidRainSeverity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Climate Impact:</span>
                    <span className="font-medium">{results.climateImpact}</span>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                🔬 Educational note: These values are approximate, based on scaling laws from 
                NASA, USGS, and peer-reviewed studies of Chicxulub, Tunguska, and Chelyabinsk events.
              </p>

              <div className="mt-4">
                <Button onClick={goHome} className="w-full">
                  Start Over
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <MeteorVisualization state={selectedMeteor} step={3} />
          </div>
        </div>
      </main>
    );
  }

  return null;
}