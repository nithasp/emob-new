import { config } from '../../config';
import { logger } from '../../logger';
import { LatLng } from '../../types/geo.types';
import { OsrmResponse, RouteGeometry } from '../../types/pipeline.types';
import { roadDistanceKm, round, travelMinutes } from '../../utils/geo';

// The route map thins a line to every 10th point before drawing it. Ten points per leg keep each
// stop on the line after that thinning.
const POINTS_PER_LEG = 10;
const OSRM_TIMEOUT_MS = 10_000;

function estimate(points: LatLng[]): RouteGeometry {
  const coordinates: number[][] = [];
  const legDistancesKm: number[] = [];
  const legDurationsMin: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (!from || !to) continue;

    if (i === 0) coordinates.push([from.longitude, from.latitude]);
    for (let step = 1; step <= POINTS_PER_LEG; step++) {
      const t = step / POINTS_PER_LEG;
      coordinates.push([
        round(from.longitude + (to.longitude - from.longitude) * t, 6),
        round(from.latitude + (to.latitude - from.latitude) * t, 6),
      ]);
    }
    const distanceKm = roadDistanceKm(from, to);
    legDistancesKm.push(distanceKm);
    legDurationsMin.push(travelMinutes(distanceKm));
  }
  return { coordinates, legDistancesKm, legDurationsMin, source: 'estimate' };
}

async function fromOsrm(points: LatLng[]): Promise<RouteGeometry | null> {
  const path = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
  const url = `${config.solver.osrmUrl}/route/v1/driving/${path}?overview=full&geometries=geojson&steps=false`;

  const response = await fetch(url, { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS) });
  if (!response.ok) return null;

  const body = (await response.json()) as OsrmResponse;
  const route = body.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  const legs = route?.legs;
  if (body.code !== 'Ok' || !coordinates?.length || legs?.length !== points.length - 1) return null;

  return {
    coordinates,
    legDistancesKm: legs.map((leg) => (leg.distance ?? 0) / 1000),
    legDurationsMin: legs.map((leg) => (leg.duration ?? 0) / 60),
    source: 'osrm',
  };
}

export async function routeGeometry(points: LatLng[]): Promise<RouteGeometry> {
  if (config.solver.osrmUrl && points.length > 1) {
    try {
      const routed = await fromOsrm(points);
      if (routed) return routed;
    } catch (err) {
      logger.warn({ err }, 'routing service did not answer, falling back to straight legs');
    }
  }
  return estimate(points);
}
