const CONTENT_TYPES: Record<string, string> = {
  json: 'application/json',
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
};

export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

export const contentTypeOf = (name: string): string =>
  CONTENT_TYPES[extensionOf(name)] ?? 'application/octet-stream';

export const baseNameOf = (key: string): string => key.slice(key.lastIndexOf('/') + 1);

const MAX_FILENAME_LENGTH = 120;

// An uploaded file name becomes part of an object key and of a Content-Disposition header, so it
// keeps letters (any script), digits and a few separators and nothing that could steer a path
export function safeFileName(name: string, fallback = 'file'): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = base
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}._ ()-]+/gu, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s]+/, '')
    .trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= MAX_FILENAME_LENGTH) return cleaned;

  const extension = extensionOf(cleaned);
  const stem = cleaned.slice(0, MAX_FILENAME_LENGTH - extension.length - 1);
  return extension ? `${stem}.${extension}` : stem;
}

const SAFE_SEGMENT = /^[\p{L}\p{M}\p{N}._ ()-]+$/u;

// Keys are built by the server, but the download route receives one from a URL: only plain
// segments are accepted, so "..", empty segments and backslashes never reach a driver
export function isSafeKey(key: string): boolean {
  if (!key || key.length > 600 || key.startsWith('/') || key.endsWith('/')) return false;
  return key.split('/').every((segment) => segment !== '.' && segment !== '..' && SAFE_SEGMENT.test(segment));
}

export const companyPrefix = (companyId: string): string => `companies/${companyId}`;

export const experimentPrefix = (companyId: string, runId: string): string =>
  `${companyPrefix(companyId)}/experiments/${runId}`;

export const configurationPrefix = (companyId: string, configurationId: string): string =>
  `${companyPrefix(companyId)}/configurations/${configurationId}`;

export const experimentKeys = (companyId: string, runId: string) => {
  const prefix = experimentPrefix(companyId, runId);
  return {
    prefix,
    input: (keyName: string, fileName: string) => `${prefix}/input/${keyName}/${fileName}`,
    transformLocations: `${prefix}/transform/locations.json`,
    transformWarning: `${prefix}/transform/warning.json`,
    parameterFormats: `${prefix}/validate/parameterFormats.json`,
    vehicleTypes: `${prefix}/validate/vehicleTypes.json`,
    preVRPSolution: `${prefix}/validate/preVRPSolution.json`,
    errorWarning: `${prefix}/validate/errorWarning.json`,
    vrpSolutionLean: `${prefix}/plan/vrpSolutionLean.json`,
    geoJson: `${prefix}/plan/geoJson.json`,
    vrpStats: `${prefix}/plan/vrpStats.json`,
    result: (fileName: string) => `${prefix}/result/${fileName}`,
  };
};
