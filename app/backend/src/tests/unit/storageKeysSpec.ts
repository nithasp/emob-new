import {
  companyPrefix,
  contentTypeOf,
  experimentKeys,
  isSafeKey,
  safeFileName,
} from '../../services/storage/keys';

describe('Storage keys', () => {
  describe('isSafeKey', () => {
    it('accepts the keys the server builds, Thai file names included', () => {
      const keys = experimentKeys('c0a8012e-0000-4000-8000-000000000001', 'run-1');
      expect(isSafeKey(keys.vrpStats)).toBe(true);
      expect(isSafeKey(keys.input('preorder', 'คำสั่งซื้อ สัปดาห์ 40 (final).xlsx'))).toBe(true);
    });

    it('refuses anything that could leave the store', () => {
      for (const key of [
        '',
        '/etc/passwd',
        'companies/../.env',
        'companies/./x',
        'companies//x',
        'companies/x/',
        'companies\\x',
        'companies/a%2F..%2Fb',
      ]) {
        expect(isSafeKey(key)).withContext(key).toBe(false);
      }
    });
  });

  describe('safeFileName', () => {
    it('keeps a readable name and drops any directory part', () => {
      expect(safeFileName('C:\\Users\\me\\orders week 40.xlsx')).toBe('orders week 40.xlsx');
      expect(safeFileName('../../etc/passwd')).toBe('passwd');
      expect(safeFileName('รายการสั่งซื้อ.csv')).toBe('รายการสั่งซื้อ.csv');
    });

    it('replaces characters that could break a path or a header', () => {
      expect(safeFileName('a"b<c>d|e.xlsx')).toBe('a_b_c_d_e.xlsx');
      expect(safeFileName('..hidden')).toBe('hidden');
    });

    it('falls back when nothing usable is left, and keeps the extension of a long name', () => {
      expect(safeFileName('///')).toBe('file');
      const long = safeFileName(`${'x'.repeat(300)}.xlsx`);
      expect(long.length).toBe(120);
      expect(long.endsWith('.xlsx')).toBe(true);
    });
  });

  it('scopes every key of a company under one prefix', () => {
    const keys = experimentKeys('company-1', 'run-1');
    const prefix = `${companyPrefix('company-1')}/`;
    for (const key of [keys.transformLocations, keys.geoJson, keys.result('plan.xlsx')]) {
      expect(key.startsWith(prefix)).withContext(key).toBe(true);
    }
  });

  it('serves a known file type as itself and anything else as a download', () => {
    expect(contentTypeOf('plan/geoJson.json')).toBe('application/json');
    expect(contentTypeOf('ORDERS.XLSX')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(contentTypeOf('page.html')).toBe('application/octet-stream');
  });
});
