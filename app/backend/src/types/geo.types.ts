export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface GazetteerSubdistrict {
  en: string;
  zip: number;
}

export interface GazetteerDistrict {
  en: string;
  th: string;
  latitude: number;
  longitude: number;
  subdistricts: GazetteerSubdistrict[];
}

export interface GazetteerProvince {
  en: string;
  th: string;
  latitude: number;
  longitude: number;
  districts: GazetteerDistrict[];
}

export type GeocodeLevel = 'subdistrict' | 'district' | 'province';

export interface GeocodeHit extends LatLng {
  level: GeocodeLevel;
  province: string;
  district: string | null;
  subdistrict: string | null;
  postalCode: number | null;
}

export interface AddressParts {
  subdistrict?: string | null | undefined;
  district?: string | null | undefined;
  province?: string | null | undefined;
}

export interface NearestDistrict {
  province: string;
  district: string;
  distanceKm: number;
}
