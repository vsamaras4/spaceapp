// components/custom-meteor/MeteorVisualization.tsx
import { cn } from "@/lib/utils";
import type { MeteorState, WizardStep } from "@/lib/meteor";

interface MeteorVisualizationProps {
  state: MeteorState;
  step: WizardStep;
  className?: string;
}

export function MeteorVisualization({ state, step, className }: MeteorVisualizationProps) {
  // --- Visual scalars (independent of the reference scale logic) ---
  const r = Math.max(8, Math.min(32, state.diameter_m / 10));          // meteor radius
  const tailLen = Math.max(20, Math.min(100, state.velocity_kms * 2)); // tail length
  const angle = state.angle_deg;

  const showTail = step >= 1;
  const showAngle = step >= 2;

  // --- Reference objects (real-world linear spans in meters; ≤ 10,000 m) ---
  const referenceObjects = [
    { name: "Car", size: 4.6, icon: "🚗", color: "#3b82f6" },                      // typical sedan length
    { name: "House (frontage)", size: 12, icon: "🏠", color: "#10b981" },          // typical detached-house frontage
    { name: "Mid-rise Building (height)", size: 45, icon: "🏢", color: "#f59e0b" },// ~15 floors @ ~3 m/floor
    { name: "City Block (Manhattan long side)", size: 274, icon: "🏙️", color: "#8b5cf6" }, // ~80×274 m; long side
    { name: "Village (across)", size: 2000, icon: "🏘️", color: "#06b6d4" },       // small village span
    { name: "Central Park (length N→S)", size: 4000, icon: "🌳", color: "#22c55e" }, // ~4.0 km long
    { name: "Manhattan (width at widest)", size: 3700, icon: "🏙️", color: "#ef4444" }, // ~3.7 km wide
    { name: "Small Town (across)", size: 5000, icon: "🏘️", color: "#10b981" },    // compact town span
    { name: "Small City (across)", size: 10000, icon: "🏙️", color: "#f59e0b" }    // compact small city diameter
  ];

  // --- SCALE PREP (fixed logic) ------------------------------------------------
  const meteorSize = state.diameter_m;

  // Work on a sorted copy to ensure monotonic scale
  const sortedRefs = [...referenceObjects].sort((a, b) => a.size - b.size);

  // Find closest reference to the meteor size
  const closestIndex = sortedRefs.reduce((bestIdx, obj, idx) => {
    const bestDiff = Math.abs(sortedRefs[bestIdx].size - meteorSize);
    const diff = Math.abs(obj.size - meteorSize);
    return diff < bestDiff ? idx : bestIdx;
  }, 0);

  const closestReference = sortedRefs[closestIndex];

  // Visible window: 3 items around closest when possible
  const windowSize = 3;
  const startIndex = Math.max(0, Math.min(closestIndex - 1, sortedRefs.length - windowSize));
  const visibleObjects = sortedRefs.slice(startIndex, startIndex + windowSize);

  // Log scale used consistently for BOTH markers and meteor
  const scaleWidth = 300;
  const scaleHeight = 60;

  const minLog = Math.log10(visibleObjects[0].size);
  const maxLog = Math.log10(visibleObjects[visibleObjects.length - 1].size);
  const denom = Math.max(1e-6, maxLog - minLog); // guard divide-by-zero
  const xForSize = (s: number) => ((Math.log10(s) - minLog) / denom) * scaleWidth;

  // Clamp meteor position within the scale
  const meteorPosition = Math.max(0, Math.min(scaleWidth, xForSize(meteorSize)));

  return (
    <div className={cn("w-full aspect-square rounded-2xl border p-4", className)}>
      <svg viewBox="0 0 400 400" className="h-full w-full">
        {/* Background */}
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopOpacity={1} />
            <stop offset="100%" stopOpacity={1} />
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#sky)" className="fill-muted" />

        {/* Ground only when angle step is active to avoid previewing future info */}
        {showAngle && (
          <g>
            <rect x="0" y="330" width="400" height="70" className="fill-secondary" />
            <text x="12" y="355" className="fill-muted-foreground text-[12px]">Ground</text>
          </g>
        )}

        {/* Moving Scale - shows when diameter step is active */}
        {step >= 0 && (
          <g transform={`translate(50, 200)`}>
            {/* Scale background */}
            <rect
              x={0}
              y={0}
              width={scaleWidth}
              height={scaleHeight}
              fill="rgba(0,0,0,0.3)"
              rx={8}
              className="animate-fade-in"
            />

            {/* Scale line */}
            <line
              x1={0}
              y1={scaleHeight / 2}
              x2={scaleWidth}
              y2={scaleHeight / 2}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
            />

            {/* Visible reference objects on scale (log-spaced) */}
            {visibleObjects.map((obj) => {
              const x = xForSize(obj.size);
              const isClosest = obj === closestReference;
              const objSizePx = isClosest ? 20 : 15;

              return (
                <g key={obj.name}>
                  {/* Object marker */}
                  <circle
                    cx={x}
                    cy={scaleHeight / 2}
                    r={objSizePx / 2}
                    fill={obj.color}
                    fillOpacity={isClosest ? 0.8 : 0.4}
                    stroke={isClosest ? "white" : "rgba(255,255,255,0.6)"}
                    strokeWidth={isClosest ? 2 : 1}
                    className={isClosest ? "animate-pulse" : ""}
                    style={{ transition: "all 0.3s ease-in-out" }}
                  />

                  {/* Object icon */}
                  <text
                    x={x}
                    y={scaleHeight / 2 + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={isClosest ? 12 : 8}
                    style={{ transition: "all 0.3s ease-in-out" }}
                  >
                    {obj.icon}
                  </text>

                  {/* Object label */}
                  <text
                    x={x}
                    y={scaleHeight + 15}
                    textAnchor="middle"
                    fontSize={isClosest ? 10 : 8}
                    fill={isClosest ? "white" : "rgba(255,255,255,0.8)"}
                    fontWeight={isClosest ? "bold" : "normal"}
                    style={{ transition: "all 0.3s ease-in-out" }}
                  >
                    {obj.name}
                  </text>

                  {/* Size value */}
                  <text
                    x={x}
                    y={scaleHeight + 28}
                    textAnchor="middle"
                    fontSize={8}
                    fill="rgba(255,255,255,0.6)"
                    style={{ transition: "all 0.3s ease-in-out" }}
                  >
                    {obj.size}m
                  </text>
                </g>
              );
            })}

            {/* Meteor position indicator (log-aligned) */}
            <g transform={`translate(${meteorPosition}, ${scaleHeight / 2})`}>
              <circle
                cx={0}
                cy={0}
                r={8}
                fill="#ff6b6b"
                stroke="white"
                strokeWidth={2}
                className="animate-pulse"
              />
              <text x={0} y={2} textAnchor="middle" dominantBaseline="middle" fontSize={10}>
                ☄️
              </text>
              <text
                x={0}
                y={-25}
                textAnchor="middle"
                fontSize={10}
                fill="white"
                fontWeight="bold"
                className="animate-fade-in"
              >
                {meteorSize}m
              </text>
            </g>

            {/* Scale title with current focus */}
            <text
              x={scaleWidth / 2}
              y={-25}
              textAnchor="middle"
              fontSize={12}
              fill="white"
              fontWeight="bold"
              className="animate-fade-in"
            >
              Size Scale - Focus: {closestReference.name}
            </text>

            {/* Navigation indicators */}
            {closestIndex > 0 && (
              <text
                x={10}
                y={scaleHeight / 2}
                textAnchor="middle"
                fontSize={16}
                fill="rgba(255,255,255,0.6)"
                className="animate-fade-in"
              >
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
                className="animate-fade-in"
              >
                →
              </text>
            )}
          </g>
        )}

        {/* Approach group (rotates when angle is active) */}
        <g transform={showAngle ? `translate(200,180) rotate(${180 - angle})` : `translate(200,180)`}>
          {/* Tail (only on/after velocity step) */}
          {showTail && (
            <g>
              <rect x={-tailLen - r - 10} y={-4} width={tailLen} height={8} rx={4} className="fill-accent/70" />
              <rect x={-tailLen - r - 10} y={-2} width={tailLen} height={4} rx={2} className="fill-accent" />
            </g>
          )}

          {/* Meteor body (always visible) */}
          <g>
            <circle cx={0} cy={0} r={r} className="fill-primary" />
            <circle cx={-r * 0.35} cy={-r * 0.35} r={r * 0.35} className="fill-primary/60" />
          </g>

          {/* Direction nib (only when angle step is active) */}
          {showAngle && <polygon points={`${r + 8},0 ${r - 8},8 ${r - 8},-8`} className="fill-primary-foreground" />}
        </g>

        {/* Angle label (only when angle step is active) */}
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
