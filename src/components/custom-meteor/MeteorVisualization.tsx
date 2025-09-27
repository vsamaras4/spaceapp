// components/custom-meteor/MeteorVisualization.tsx
import { cn } from "@/lib/utils";
import type { MeteorState, WizardStep } from "@/lib/meteor";
import { useEffect, useState } from "react";

interface MeteorVisualizationProps {
  state: MeteorState;
  step: WizardStep;
  className?: string;
}

interface VelocityDotsProps {
  velocity: number;
  isVisible: boolean;
}

function VelocityDots({ velocity, isVisible }: VelocityDotsProps) {
  const [dots, setDots] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      trail: Array<{ x: number; y: number; opacity: number }>;
      opacity: number;
    }>
  >([]);
  const [nextId, setNextId] = useState(0);

  const normalizedVelocity = (velocity - 12) / (72 - 12);
  const dotSpeed = 0.5 + normalizedVelocity * 2;
  const trailLength = Math.max(3, Math.min(15, Math.round(dotSpeed * 3)));

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const newDot = {
        id: nextId,
        x: 400,
        y: Math.random() * 200 + 50,
        opacity: 0.7 + Math.random() * 0.3,
        trail: [] as Array<{ x: number; y: number; opacity: number }>,
      };

      setDots((prev) => [...prev, newDot]);
      setNextId((prev) => prev + 1);
    }, 200);

    return () => clearInterval(interval);
  }, [isVisible, nextId]);

  useEffect(() => {
    if (!isVisible) return;

    const animationInterval = setInterval(() => {
      setDots((prev) =>
        prev
          .map((dot) => {
            const newTrailPoint = {
              x: dot.x,
              y: dot.y,
              opacity: dot.opacity,
            };

            const updatedTrail = [newTrailPoint, ...dot.trail].slice(0, trailLength);

            return {
              ...dot,
              x: dot.x - dotSpeed,
              trail: updatedTrail,
            };
          })
          .filter((dot) => dot.x > -50)
      );
    }, 16);

    return () => clearInterval(animationInterval);
  }, [isVisible, dotSpeed, trailLength]);

  if (!isVisible) return null;

  return (
    <g>
      {dots.map((dot) => (
        <g key={dot.id}>
          {dot.trail.map((trailPoint, index) => (
            <circle
              key={`${dot.id}-trail-${index}`}
              cx={trailPoint.x}
              cy={trailPoint.y}
              r={1.2}
              fill="rgba(255, 255, 255, 0.4)"
              opacity={trailPoint.opacity * (1 - index / trailLength) * 0.6}
            />
          ))}
          <circle cx={dot.x} cy={dot.y} r={1.5} fill="rgba(255, 255, 255, 0.8)" opacity={dot.opacity} />
        </g>
      ))}
    </g>
  );
}

export function MeteorVisualization({ state, step, className }: MeteorVisualizationProps) {
  const r = Math.max(10, Math.min(100, state.diameter_m / 100));
  const tailLen = Math.max(20, Math.min(100, state.velocity_kms * 2));
  const angle = state.angle_deg;

  const showTail = step >= 1;
  const showAngle = step >= 2;

  const referenceObjects = [
    { name: "Car", size: 4.6, icon: "🚗", color: "#3b82f6" },
    { name: "House (frontage)", size: 12, icon: "🏠", color: "#10b981" },
    { name: "Mid-rise Building (height)", size: 45, icon: "🏢", color: "#f59e0b" },
    { name: "City Block (Manhattan long side)", size: 274, icon: "🏙️", color: "#8b5cf6" },
    { name: "Village (across)", size: 2000, icon: "🏘️", color: "#06b6d4" },
    { name: "Central Park (length N→S)", size: 4000, icon: "🌳", color: "#22c55e" },
    { name: "Manhattan (width at widest)", size: 3700, icon: "🏙️", color: "#ef4444" },
    { name: "Small Town (across)", size: 5000, icon: "🏘️", color: "#10b981" },
    { name: "Small City (across)", size: 10000, icon: "🏙️", color: "#f59e0b" },
  ];

  const meteorSize = state.diameter_m;
  const sortedRefs = [...referenceObjects].sort((a, b) => a.size - b.size);
  const closestIndex = sortedRefs.reduce((bestIdx, obj, idx) => {
    const bestDiff = Math.abs(sortedRefs[bestIdx].size - meteorSize);
    const diff = Math.abs(obj.size - meteorSize);
    return diff < bestDiff ? idx : bestIdx;
  }, 0);
  const closestReference = sortedRefs[closestIndex];

  const windowSize = 3;
  const startIndex = Math.max(0, Math.min(closestIndex - 1, sortedRefs.length - windowSize));
  const visibleObjects = sortedRefs.slice(startIndex, startIndex + windowSize);

  const scaleWidth = 300;
  const scaleHeight = 60;

  const minLog = Math.log10(visibleObjects[0].size);
  const maxLog = Math.log10(visibleObjects[visibleObjects.length - 1].size);
  const denom = Math.max(1e-6, maxLog - minLog);
  const xForSize = (s: number) => ((Math.log10(s) - minLog) / denom) * scaleWidth;

  const meteorPosition = Math.max(0, Math.min(scaleWidth, xForSize(meteorSize)));

  return (
    <div className={cn("w-full aspect-square rounded-2xl border p-4", className)}>
      <svg viewBox="0 0 400 400" className="h-full w-full">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopOpacity={1} />
            <stop offset="100%" stopOpacity={1} />
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#sky)" className="fill-muted" />

        <VelocityDots velocity={state.velocity_kms} isVisible={step === 1} />

        {showAngle && (
          <g>
            <rect x="0" y="330" width="400" height="70" className="fill-secondary" />
            <text x="12" y="355" className="fill-muted-foreground text-[12px]">
              Ground
            </text>
          </g>
        )}

        {step >= 0 && (
          <g transform={`translate(50, 300)`}>
            <rect x={0} y={0} width={scaleWidth} height={scaleHeight} fill="rgba(0,0,0,0.3)" rx={8} />
            <line
              x1={0}
              y1={scaleHeight / 2}
              x2={scaleWidth}
              y2={scaleHeight / 2}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
            />

            {visibleObjects.map((obj) => {
              const x = xForSize(obj.size);
              const isClosest = obj === closestReference;
              const objSizePx = isClosest ? 20 : 15;

              return (
                <g key={obj.name}>
                  <circle
                    cx={x}
                    cy={scaleHeight / 2}
                    r={objSizePx / 2}
                    fill={obj.color}
                    fillOpacity={isClosest ? 0.8 : 0.4}
                    stroke={isClosest ? "white" : "rgba(255,255,255,0.6)"}
                    strokeWidth={isClosest ? 2 : 1}
                    className={isClosest ? "animate-pulse" : ""}
                  />
                  <text x={x} y={scaleHeight / 2 + 2} textAnchor="middle" dominantBaseline="middle" fontSize={isClosest ? 12 : 8}>
                    {obj.icon}
                  </text>
                  <text
                    x={x}
                    y={scaleHeight + 15}
                    textAnchor="middle"
                    fontSize={isClosest ? 10 : 8}
                    fill={isClosest ? "white" : "rgba(255,255,255,0.8)"}
                    fontWeight={isClosest ? "bold" : "normal"}
                  >
                    {obj.name}
                  </text>
                  <text x={x} y={scaleHeight + 28} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.6)">
                    {obj.size}m
                  </text>
                </g>
              );
            })}

            <g transform={`translate(${meteorPosition}, ${scaleHeight / 2})`}>
              <circle cx={0} cy={0} r={8} fill="#ff6b6b" stroke="white" strokeWidth={2} className="animate-pulse" />
              <text x={0} y={2} textAnchor="middle" dominantBaseline="middle" fontSize={10}>
                ☄️
              </text>
              <text x={0} y={-25} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">
                {meteorSize}m
              </text>
            </g>

            <text x={scaleWidth / 2} y={-25} textAnchor="middle" fontSize={12} fill="white" fontWeight="bold">
              Size Scale - Focus: {closestReference.name}
            </text>

            {closestIndex > 0 && (
              <text x={10} y={scaleHeight / 2} textAnchor="middle" fontSize={16} fill="rgba(255,255,255,0.6)">
                ←
              </text>
            )}
            {closestIndex < sortedRefs.length - 1 && (
              <text
                x={scaleWidth - 10}
                y={scaleHeight / 2}
                textAnchor="middle"
                fontSize={16}
                fill="rgba(255,255,255,0.6)"
              >
                →
              </text>
            )}
          </g>
        )}

        <g transform={showAngle ? `translate(200,100) rotate(${180 - angle})` : `translate(200,100)`}>
          {showTail && (
            <g>
              <rect x={-tailLen - r - 10} y={-4} width={tailLen} height={8} rx={4} className="fill-accent/70" />
              <rect x={-tailLen - r - 10} y={-2} width={tailLen} height={4} rx={2} className="fill-accent" />
            </g>
          )}

          {/* Meteor body replaced with SVG */}
          <g>
            <image
              href="/meteor.svg" // make sure public/meteor.svg exists
              x={-r}
              y={-r}
              width={r * 2}
              height={r * 2}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>

          {showAngle && <polygon points={`${r + 8},0 ${r - 8},8 ${r - 8},-8`} className="fill-primary-foreground" />}
        </g>

        {showAngle && (
          <g>
            <text x="12" y="24" className="fill-foreground text-[12px]">
              Approach angle: {angle.toFixed(0)}°
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
