// components/custom-meteor/MeteorVisualization.tsx
import { cn } from "@/lib/utils";
import type { MeteorState, WizardStep } from "@/lib/meteor";
import { useEffect, useRef } from "react";

interface MeteorVisualizationProps {
  state: MeteorState;
  step: WizardStep;
  className?: string;
}

function CanvasStars({
  velocity,      // km/s
  enabled,       // render only on velocity step
  stageRef,      // container to size-align with SVG
}: {
  velocity: number;
  enabled: boolean;
  stageRef: React.RefObject<HTMLDivElement>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const spawnAccRef = useRef(0);

  // live velocity ref (so changing the slider doesn't recreate the effect)
  const velRef = useRef(velocity);
  useEffect(() => {
    // clamp so calculations are stable
    velRef.current = Math.min(72, Math.max(12, velocity));
  }, [velocity]);

  // Pool
  type Dot = {
    x: number; y: number; vx: number; opacity: number; angle: number;
    tx: Float32Array; ty: Float32Array; to: Float32Array; head: number; len: number;
  };
  const poolRef = useRef<Dot[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // constants
  const SCALE_BASE = 400;
  const MAX_DOTS = 140;
  const MAX_TRAIL_LEN = 8; // fixed to avoid reallocation

  useEffect(() => {
    if (!stageRef.current) return;

    // Create canvas if needed (between bg and SVG)
    if (!canvasRef.current) {
      const c = document.createElement("canvas");
      c.className = "absolute inset-0 z-5 pointer-events-none";
      stageRef.current.appendChild(c);
      canvasRef.current = c;
    }

    // Load star image once
    if (!imgRef.current) {
      const img = new Image();
      img.src = "/star.png";
      imgRef.current = img;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      if (!stageRef.current) return;
      const { clientWidth, clientHeight } = stageRef.current;
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stageRef.current);

    const clearAll = () => {
      poolRef.current.length = 0;
      spawnAccRef.current = 0;
      lastTsRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // helper: compute live params from current velocity + size
    const getParams = () => {
      const v = velRef.current;
      const norm = (v - 12) / (72 - 12);             // 0..1
      const widthPx = stageRef.current!.clientWidth || 400;
      const pxScale = widthPx / SCALE_BASE;

      const pxPerSec = (50 + norm * 140) * pxScale;  // 50→190 px/s
      const spawnPerSec = 4 + norm * 10;             // 4→14 stars/s
      const spawnInterval = 1 / spawnPerSec;

      const STAR_MAIN = 5 * pxScale;
      const STAR_TRAIL = 4.2 * pxScale;

      // we *don’t* resize buffers; use a live clamp for logical trail length
      const trailLenLive = Math.round(2 + norm * 6); // 2→8 (≤ MAX_TRAIL_LEN)

      return { pxPerSec, spawnInterval, STAR_MAIN, STAR_TRAIL, trailLenLive };
    };

    // Spawn a new star using current params
    const spawn = (pxPerSec: number) => {
      if (poolRef.current.length >= MAX_DOTS) return;
      const stg = stageRef.current!;
      const h = stg.clientHeight || 400;
      const bandTop = 50 / SCALE_BASE;
      const bandBot = 250 / SCALE_BASE;
      const y = (bandTop + Math.random() * (bandBot - bandTop)) * h;
      const opacity = 0.7 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2; // radians
      const vx = -pxPerSec;

      const tx = new Float32Array(MAX_TRAIL_LEN);
      const ty = new Float32Array(MAX_TRAIL_LEN);
      const to = new Float32Array(MAX_TRAIL_LEN);
      const dot: Dot = { x: stg.clientWidth, y, vx, opacity, angle, tx, ty, to, head: 0, len: 0 };
      poolRef.current.push(dot);
    };

    const tick = (ts: number) => {
      if (!enabled) {
        rafRef.current = null;
        return;
      }

      const last = lastTsRef.current ?? ts;
      let dt = (ts - last) / 1000;
      lastTsRef.current = ts;

      if (dt > 0.08) dt = 0.016; // clamp big gaps

      const stg = stageRef.current!;
      const W = stg.clientWidth || 400;
      const H = stg.clientHeight || 400;

      // live params (from current slider value)
      const { pxPerSec, spawnInterval, STAR_MAIN, STAR_TRAIL, trailLenLive } = getParams();
      const targetVx = -pxPerSec;
      const smooth = Math.min(1, dt * 8); // exponential smoothing toward new speed

      // Move + record trails; adjust vx smoothly; compact in place
      let write = 0;
      for (let i = 0; i < poolRef.current.length; i++) {
        const d = poolRef.current[i];

        // push current pos to ring buffer
        d.tx[d.head] = d.x;
        d.ty[d.head] = d.y;
        d.to[d.head] = d.opacity;
        d.head = (d.head + 1) % MAX_TRAIL_LEN;

        // logical trail length follows live clamp, no reallocation
        d.len = Math.min(MAX_TRAIL_LEN, Math.min(trailLenLive, d.len + 1));

        // smoothly adapt velocity to new target
        d.vx += (targetVx - d.vx) * smooth;

        // integrate
        d.x += d.vx * dt;

        if (d.x > -50) poolRef.current[write++] = d;
      }
      poolRef.current.length = write;

      // Spawn at live rate (limit to 1 per frame to avoid spikes)
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= spawnInterval) {
        spawnAccRef.current -= Math.floor(spawnAccRef.current / spawnInterval) * spawnInterval;
        if (poolRef.current.length < MAX_DOTS) spawn(pxPerSec);
      }

      // Draw
      ctx.clearRect(0, 0, W, H);
      const img = imgRef.current;
      if (img && img.complete) {
        for (let i = 0; i < poolRef.current.length; i++) {
          const d = poolRef.current[i];

          // trail (older → more transparent)
          for (let t = 0; t < d.len; t++) {
            const idx = (d.head - 1 - t + MAX_TRAIL_LEN) % MAX_TRAIL_LEN;
            const alpha = d.to[idx] * (1 - t / Math.max(1, d.len)) * 0.6;
            if (alpha <= 0.01) continue;
            ctx.save();
            ctx.translate(d.tx[idx], d.ty[idx]);
            ctx.rotate(d.angle);
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, -STAR_TRAIL / 2, -STAR_TRAIL / 2, STAR_TRAIL, STAR_TRAIL);
            ctx.restore();
          }

          // main sprite
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.angle);
          ctx.globalAlpha = d.opacity;
          ctx.drawImage(img, -STAR_MAIN / 2, -STAR_MAIN / 2, STAR_MAIN, STAR_MAIN);
          ctx.restore();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!enabled) return;
      if (rafRef.current == null) {
        lastTsRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        stop();
        // no catch-up on return, but keep stars; just reset timers
        spawnAccRef.current = 0;
        lastTsRef.current = null;
      } else if (enabled) {
        start();
      }
    };

    document.addEventListener("visibilitychange", onVis);
    if (enabled) start(); else {
      stop();
      // don't clear the pool here; keep stars when toggling speeds elsewhere
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
      // keep canvas node & pool for reuse across re-mounts of SVG wrapper
      ro.disconnect();
    };
  // IMPORTANT: don't depend on `velocity`, so stars don't reset on slider move
  }, [enabled, stageRef]);

  return null;
}


export function MeteorVisualization({ state, step, className }: MeteorVisualizationProps) {
  // --- Visual scalars (independent of the reference scale logic) ---
  const r = Math.max(10, Math.min(100, state.diameter_m / 100));          // meteor radius
  const tailLen = Math.max(20, Math.min(100, state.velocity_kms * 2));     // tail length
  const angle = state.angle_deg;

  const showTail = step >= 1;
  const showAngle = step >= 2;

  // --- Reference objects (real-world linear spans in meters; ≤ 10,000 m) ---
  const referenceObjects = [
    { name: "Car", size: 4.6, icon: "🚗", color: "#3b82f6" },
    { name: "House (frontage)", size: 12, icon: "🏠", color: "#10b981" },
    { name: "Mid-rise Building (height)", size: 45, icon: "🏢", color: "#f59e0b" },
    { name: "City Block (Manhattan long side)", size: 274, icon: "🏙️", color: "#8b5cf6" },
    { name: "Village (across)", size: 2000, icon: "🏘️", color: "#06b6d4" },
    { name: "Central Park (length N→S)", size: 4000, icon: "🌳", color: "#22c55e" },
    { name: "Manhattan (width at widest)", size: 3700, icon: "🏙️", color: "#ef4444" },
    { name: "Small Town (across)", size: 5000, icon: "🏘️", color: "#10b981" },
    { name: "Small City (across)", size: 10000, icon: "🏙️", color: "#f59e0b" }
  ];

  // --- SCALE PREP (fixed logic) ------------------------------------------------
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
  const denom = Math.max(1e-6, maxLog - minLog); // guard divide-by-zero
  const xForSize = (s: number) => ((Math.log10(s) - minLog) / denom) * scaleWidth;

  const meteorPosition = Math.max(0, Math.min(scaleWidth, xForSize(meteorSize)));

  // Stage wrapper to co-locate background, canvas, and svg
  const stageRef = useRef<HTMLDivElement>(null!);

  return (
    <div className={cn("w-full aspect-square rounded-2xl border p-4", className)}>
      <div ref={stageRef} className="relative h-full w-full">
        {/* Background (moved out of SVG so canvas can be seen) */}
        <div className="absolute inset-0 z-0 bg-black" aria-hidden />

        {/* Canvas stars (between background and SVG content) */}
        <CanvasStars
          velocity={state.velocity_kms}
          enabled={step === 1}
          stageRef={stageRef}
        />

        {/* SVG content on top */}
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full z-10">
          {/* Background rect REMOVED so it doesn't cover the canvas */}

          {/* Ground only when angle step is active to avoid previewing future info */}
          {showAngle && (
            <g>
              <rect x="0" y="330" width="400" height="70" className="fill-secondary" />
              <text x="12" y="355" className="fill-muted-foreground text-[12px]">Ground</text>
            </g>
          )}

          {/* Moving Scale - shows when diameter step is active */}
          {step >= 0 && (
            <g transform={`translate(50, 300)`}>
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
          <g transform={showAngle ? `translate(200,100) rotate(${180 - angle})` : `translate(200,100)`}>
            {/* Tail (only on/after velocity step) */}
            {showTail && (
              <g>
                <rect x={-tailLen - r - 10} y={-4} width={tailLen} height={8} rx={4} className="fill-accent/70" />
                <rect x={-tailLen - r - 10} y={-2} width={tailLen} height={4} rx={2} className="fill-accent" />
              </g>
            )}

            {/* Meteor body (always visible) */}
            <g>
              <image
                href="/meteor.svg" // ensure public/meteor.svg exists
                x={-r}
                y={-r}
                width={r * 2}
                height={r * 2}
                preserveAspectRatio="xMidYMid meet"
              />
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
    </div>
  );
}
