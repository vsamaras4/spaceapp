"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const MAPBOX_VERSION = "3.1.2";
const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const DEFAULT_CENTER = { lng: 0, lat: 20 };
const DEFAULT_ZOOM = 1.2;
const DEFAULT_FLY_ZOOM = 5;

// Minimal Mapbox GL typings for runtime interactions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapboxGL = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkerInstance = any;

export type MapLocation = { lng: number; lat: number };

export interface MapboxMapHandle {
  flyTo: (
    location: MapLocation,
    options?: { zoom?: number; duration?: number; curve?: number; speed?: number }
  ) => void;
  showWorldView: (options?: { duration?: number; padding?: number }) => void;
  setMarker: (location: MapLocation) => void;
  clearMarker: () => void;
}

interface MapboxMapProps {
  className?: string;
  onSelect?: (lng: number, lat: number) => void;
  selectedLocation?: MapLocation | null;
  mapStyle?: string;
  accessToken?: string;
  onReady?: () => void;
}

declare global {
  interface Window {
    mapboxgl?: MapboxGL;
    __mapboxglPromise?: Promise<MapboxGL>;
  }
}

const ensureMapboxStyles = () => {
  if (typeof window === "undefined") return;
  const href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

const loadMapbox = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mapbox can only be loaded in the browser"));
  }

  if (window.mapboxgl) {
    return Promise.resolve(window.mapboxgl);
  }

  if (window.__mapboxglPromise) {
    return window.__mapboxglPromise;
  }

  ensureMapboxStyles();

  window.__mapboxglPromise = new Promise<MapboxGL>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.js`;
    script.async = true;
    script.onload = () => {
      if (window.mapboxgl) {
        resolve(window.mapboxgl);
      } else {
        reject(new Error("Mapbox GL failed to initialize"));
      }
    };
    script.onerror = () => {
      reject(new Error("Failed to load Mapbox GL"));
    };
    document.head.appendChild(script);
  });

  return window.__mapboxglPromise;
};

const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(
  ({
    className,
    onSelect,
    selectedLocation,
    mapStyle = MAPBOX_STYLE_DARK,
    accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    onReady,
  }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapInstance | null>(null);
    const markerRef = useRef<MarkerInstance | null>(null);
    const mapboxRef = useRef<MapboxGL | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const pendingActions = useRef<Array<() => void>>([]);
    const mapReadyRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const onSelectRef = useRef(onSelect);
    const onReadyRef = useRef(onReady);

    useEffect(() => {
      onSelectRef.current = onSelect;
    }, [onSelect]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    const runOrQueue = (action: () => void) => {
      if (mapRef.current && mapReadyRef.current) {
        action();
      } else {
        pendingActions.current.push(action);
      }
    };

    const ensureMarker = () => {
      if (!mapRef.current || !mapboxRef.current) return null;
      if (!markerRef.current) {
        markerRef.current = new mapboxRef.current.Marker({ color: "#f97316" });
        markerRef.current.addTo(mapRef.current);
        const el = markerRef.current.getElement?.();
        if (el) {
          el.style.pointerEvents = "none";
          el.style.transform = "translate(-50%, -100%)";
        }
      }
      return markerRef.current;
    };

    const showMarker = () => {
      const marker = ensureMarker();
      const el = marker?.getElement?.();
      if (el) {
        el.style.display = "";
      }
    };

    const hideMarker = () => {
      const el = markerRef.current?.getElement?.();
      if (el) {
        el.style.display = "none";
      }
    };

    useEffect(() => {
      let cancelled = false;
      if (!containerRef.current) return;

      loadMapbox()
        .then((mapbox) => {
          if (cancelled || !containerRef.current) return;

          mapboxRef.current = mapbox;
          if (accessToken) {
            mapbox.accessToken = accessToken;
          }

          const map = new mapbox.Map({
            container: containerRef.current,
            style: mapStyle,
            center: [selectedLocation?.lng ?? DEFAULT_CENTER.lng, selectedLocation?.lat ?? DEFAULT_CENTER.lat],
            zoom: selectedLocation ? DEFAULT_FLY_ZOOM : DEFAULT_ZOOM,
            attributionControl: false,
            cooperativeGestures: true,
            pitchWithRotate: false,
            dragRotate: false,
          });

          mapRef.current = map;
          mapReadyRef.current = false;

          const handleClick = (event: { lngLat: { lng: number; lat: number } }) => {
            const markerInstance = ensureMarker();
            if (markerInstance) {
              markerInstance.setLngLat([event.lngLat.lng, event.lngLat.lat]);
              showMarker();
            }
            onSelectRef.current?.(event.lngLat.lng, event.lngLat.lat);
          };

          map.on("click", handleClick);

          const ro = new ResizeObserver(() => {
            map.resize();
          });
          ro.observe(containerRef.current);

          const onLoad = () => {
            mapReadyRef.current = true;
            const canvas = map.getCanvas?.();
            if (canvas) {
              canvas.style.cursor = "crosshair";
            }
            pendingActions.current.forEach((fn) => fn());
            pendingActions.current = [];
            onReadyRef.current?.();
          };

          map.once("load", onLoad);

          cleanupRef.current = () => {
            ro.disconnect();
            map.off("click", handleClick);
            if (markerRef.current) {
              markerRef.current.remove?.();
              markerRef.current = null;
            }
            map.remove();
          };
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "Unable to load map";
          setError(message);
        });

      return () => {
        cancelled = true;
        cleanupRef.current?.();
        cleanupRef.current = null;
        mapRef.current = null;
        markerRef.current = null;
        mapReadyRef.current = false;
        pendingActions.current = [];
      };
    }, [mapStyle, accessToken]);

    useEffect(() => {
      if (!selectedLocation) {
        runOrQueue(() => {
          hideMarker();
        });
        return;
      }

      runOrQueue(() => {
        const marker = ensureMarker();
        if (marker) {
          marker.setLngLat([selectedLocation.lng, selectedLocation.lat]);
          showMarker();
        }
      });
    }, [selectedLocation]);

    useImperativeHandle(ref, () => ({
      flyTo(location, options) {
        runOrQueue(() => {
          ensureMarker();
          markerRef.current?.setLngLat([location.lng, location.lat]);
          showMarker();
          mapRef.current?.flyTo?.({
            center: [location.lng, location.lat],
            zoom: options?.zoom ?? DEFAULT_FLY_ZOOM,
            duration: options?.duration ?? 1200,
            curve: options?.curve ?? 1.4,
            speed: options?.speed ?? 0.8,
            essential: true,
          });
        });
      },
      showWorldView(options) {
        runOrQueue(() => {
          const padding = options?.padding ?? 24;
          mapRef.current?.fitBounds?.(
            [
              [-170, -55],
              [170, 75],
            ],
            {
              padding,
              duration: options?.duration ?? 1200,
              essential: true,
            }
          );
        });
      },
      setMarker(location) {
        runOrQueue(() => {
          ensureMarker();
          markerRef.current?.setLngLat([location.lng, location.lat]);
          showMarker();
        });
      },
      clearMarker() {
        runOrQueue(() => {
          hideMarker();
        });
      },
    }));

    return (
      <div className={cn("relative h-full w-full", className)}>
        <div ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }
);

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
