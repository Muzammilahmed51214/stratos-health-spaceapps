import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a GeoJSON polygon approximating a circle on the map.
 * Used for the vulnerability radius feature.
 */
export function generateCirclePolygon(
  center: [number, number], // [lng, lat]
  radiusKm: number,
  numPoints: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const [lng, lat] = center;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const pointLat = lat + dy / 111.32;
    const pointLng =
      lng + dx / (111.32 * Math.cos((lat * Math.PI) / 180));
    coords.push([pointLng, pointLat]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}
