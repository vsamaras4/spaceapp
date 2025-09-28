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

export type ImpactRing = {
  id: string;
  radiusKm: number;
  color?: string;
  label?: string;
};

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
  impactRings?: ImpactRing[] | undefined;
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

type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

type GeoJSONFeature = {
  type: "Feature";
  geometry: GeoJSONPolygon;
  properties: Record<string, unknown>;
};

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

const EARTH_RADIUS_KM = 6371;
const RING_SOURCE_ID = "impact-rings";
const RING_FILL_LAYER_ID = "impact-rings-fill";
const RING_OUTLINE_LAYER_ID = "impact-rings-outline";
const RING_LABEL_LAYER_ID = "impact-rings-label";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

const createCirclePolygon = (
  center: MapLocation,
  radiusKm: number,
  steps = 128
): GeoJSONPolygon => {
  const coordinates: number[][] = [];
  const radiusRad = Math.max(0, radiusKm) / EARTH_RADIUS_KM;
  const latRad = toRadians(center.lat);
  const lngRad = toRadians(center.lng);

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * 2 * Math.PI;
    const sinLat =
      Math.sin(latRad) * Math.cos(radiusRad) +
      Math.cos(latRad) * Math.sin(radiusRad) * Math.cos(bearing);
    const lat = Math.asin(Math.min(1, Math.max(-1, sinLat)));
    const lng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radiusRad) * Math.cos(latRad),
        Math.cos(radiusRad) - Math.sin(latRad) * Math.sin(lat)
      );

    coordinates.push([toDegrees(lng), toDegrees(lat)]);
  }

  return {
    type: "Polygon",
    coordinates: [coordinates],
  };
};

const buildImpactRingCollection = (
  center: MapLocation,
  rings: ImpactRing[]
): GeoJSONFeatureCollection => {
  const sorted = [...rings].sort((a, b) => b.radiusKm - a.radiusKm);

  return {
    type: "FeatureCollection",
    features: sorted.map<GeoJSONFeature>((ring) => ({
      type: "Feature",
      geometry: createCirclePolygon(center, ring.radiusKm),
      properties: {
        id: ring.id,
        color: ring.color,
        label: ring.label,
        radiusKm: ring.radiusKm,
      },
    })),
  };
};

const emptyFeatureCollection = (): GeoJSONFeatureCollection => ({
  type: "FeatureCollection",
  features: [],
});

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
    impactRings,
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

    const ensureImpactLayers = () => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      if (!map.getSource?.(RING_SOURCE_ID)) {
        map.addSource?.(RING_SOURCE_ID, {
          type: "geojson",
          data: emptyFeatureCollection(),
        });
      }

      if (!map.getLayer?.(RING_FILL_LAYER_ID)) {
        map.addLayer?.({
          id: RING_FILL_LAYER_ID,
          type: "fill",
          source: RING_SOURCE_ID,
          layout: {},
          paint: {
            "fill-color": ["coalesce", ["get", "color"], "#f97316"],
            "fill-opacity": 0.18,
          },
        });
      }

      if (!map.getLayer?.(RING_OUTLINE_LAYER_ID)) {
        map.addLayer?.({
          id: RING_OUTLINE_LAYER_ID,
          type: "line",
          source: RING_SOURCE_ID,
          layout: {},
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#f97316"],
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });
      }

      if (!map.getLayer?.(RING_LABEL_LAYER_ID)) {
        map.addLayer?.({
          id: RING_LABEL_LAYER_ID,
          type: "symbol",
          source: RING_SOURCE_ID,
          layout: {
            "text-field": ["coalesce", ["get", "label"], ""],
            "text-size": 14,
            "text-offset": [0, 1.1],
            "text-anchor": "top",
          },
          paint: {
            "text-color": ["coalesce", ["get", "color"], "#ffffff"],
            "text-halo-color": "rgba(0,0,0,0.7)",
            "text-halo-width": 1.2,
          },
        });
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

    useEffect(() => {
      runOrQueue(() => {
        if (!impactRings || !impactRings.length || !selectedLocation) {
          const source = mapRef.current?.getSource?.(RING_SOURCE_ID);
          source?.setData?.(emptyFeatureCollection());
          return;
        }

        ensureImpactLayers();
        const source = mapRef.current?.getSource?.(RING_SOURCE_ID);
        source?.setData?.(buildImpactRingCollection(selectedLocation, impactRings));
      });
    }, [impactRings, selectedLocation]);

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
