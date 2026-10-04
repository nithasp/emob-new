import { LatLng } from '../types/geo.types';

const EARTH_RADIUS_KM = 6371;

export const ROAD_FACTOR = 1.35;

export const AVERAGE_SPEED_KMH = 28;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const roadDistanceKm = (a: LatLng, b: LatLng): number => haversineKm(a, b) * ROAD_FACTOR;

export const travelMinutes = (distanceKm: number): number => (distanceKm / AVERAGE_SPEED_KMH) * 60;

export const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const THAILAND_BOUNDS = { minLat: 5.5, maxLat: 20.6, minLng: 97.3, maxLng: 105.7 };

export function isInsideThailand(point: LatLng): boolean {
  return (
    point.latitude >= THAILAND_BOUNDS.minLat &&
    point.latitude <= THAILAND_BOUNDS.maxLat &&
    point.longitude >= THAILAND_BOUNDS.minLng &&
    point.longitude <= THAILAND_BOUNDS.maxLng
  );
}

export function parseLatLng(value: unknown): LatLng | null {
  if (typeof value !== 'string') return null;
  const match = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(value);
  if (!match) return null;
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}
