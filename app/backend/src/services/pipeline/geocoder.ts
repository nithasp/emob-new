import { GAZETTEER } from '../../data/gazetteer';
import {
  AddressParts,
  GazetteerDistrict,
  GazetteerProvince,
  GeocodeHit,
  LatLng,
  NearestDistrict,
} from '../../types/geo.types';
import { haversineKm } from '../../utils/geo';

const PREFIXES =
  /^(khet|amphoe|amphur|khwaeng|tambon|changwat|province|district|เขต|อำเภอ|แขวง|ตำบล|จังหวัด|อ\.|ต\.|จ\.)/;

const normalise = (value: string | null | undefined): string =>
  (value ?? '')
    .toLowerCase()
    .trim()
    .replace(PREFIXES, '')
    .replace(/[\s._-]+/g, '');

const PROVINCE_ALIASES: Record<string, string> = {
  bkk: 'bangkok',
  bangkokmetropolis: 'bangkok',
  krungthepmahanakhon: 'bangkok',
  krungthep: 'bangkok',
  กรุงเทพ: 'bangkok',
  กรุงเทพฯ: 'bangkok',
  กทม: 'bangkok',
};

const SUBDISTRICT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0.006, -0.007],
  [-0.008, 0.009],
  [0.01, 0.006],
];

function findProvince(name: string | null | undefined): GazetteerProvince | undefined {
  const key = normalise(name);
  if (!key) return undefined;
  const canonical = PROVINCE_ALIASES[key] ?? key;
  return GAZETTEER.find((province) => normalise(province.en) === canonical || normalise(province.th) === key);
}

function findDistrict(
  name: string | null | undefined,
  province: GazetteerProvince | undefined,
): { province: GazetteerProvince; district: GazetteerDistrict } | undefined {
  const key = normalise(name);
  if (!key) return undefined;
  for (const candidate of province ? [province] : GAZETTEER) {
    const district = candidate.districts.find(
      (entry) => normalise(entry.en) === key || normalise(entry.th) === key,
    );
    if (district) return { province: candidate, district };
  }
  return undefined;
}

export function subdistrictPoint(district: GazetteerDistrict, index: number): LatLng {
  const [dLat, dLng] = SUBDISTRICT_OFFSETS[index % SUBDISTRICT_OFFSETS.length] ?? [0, 0];
  return { latitude: district.latitude + dLat, longitude: district.longitude + dLng };
}

export function geocodeAddress(address: AddressParts): GeocodeHit | null {
  const province = findProvince(address.province);
  const match = findDistrict(address.district, province);

  if (match) {
    const key = normalise(address.subdistrict);
    const index = key ? match.district.subdistricts.findIndex((entry) => normalise(entry.en) === key) : -1;
    const subdistrict = index >= 0 ? match.district.subdistricts[index] : undefined;

    if (subdistrict) {
      return {
        ...subdistrictPoint(match.district, index),
        level: 'subdistrict',
        province: match.province.en,
        district: match.district.en,
        subdistrict: subdistrict.en,
        postalCode: subdistrict.zip,
      };
    }
    return {
      latitude: match.district.latitude,
      longitude: match.district.longitude,
      level: 'district',
      province: match.province.en,
      district: match.district.en,
      subdistrict: null,
      postalCode: match.district.subdistricts[0]?.zip ?? null,
    };
  }

  if (province) {
    return {
      latitude: province.latitude,
      longitude: province.longitude,
      level: 'province',
      province: province.en,
      district: null,
      subdistrict: null,
      postalCode: null,
    };
  }
  return null;
}

export function nearestDistrict(point: LatLng): NearestDistrict {
  let best = { province: '', district: '', distanceKm: Number.POSITIVE_INFINITY };
  for (const province of GAZETTEER) {
    for (const district of province.districts) {
      const distanceKm = haversineKm(point, district);
      if (distanceKm < best.distanceKm) best = { province: province.en, district: district.en, distanceKm };
    }
  }
  return best;
}
