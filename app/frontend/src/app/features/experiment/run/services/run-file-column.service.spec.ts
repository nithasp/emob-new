import { TestBed } from '@angular/core/testing';
import { RunFileColumnService } from './run-file-column.service';
import { RunUploadFileService } from './run-upload-file.service';
import { configureRunPage } from '../testing/run-page.testing';

describe('RunFileColumnService', () => {
  let files: RunUploadFileService;
  let fileColumns: RunFileColumnService;

  beforeEach(async () => {
    await configureRunPage();
    files = TestBed.inject(RunUploadFileService);
    fileColumns = TestBed.inject(RunFileColumnService);
  });

  it('should create', () => {
    expect(fileColumns).toBeTruthy();
  });

  describe('findMatchingInputDataItem()', () => {
    it('findMatchingInputDataItem() matches when all required columns are present', () => {
      (files as any).depotInputDataItems = [
        { keyName: 'k1', displayName: 'Category A', columnRequired: ['COL1', 'COL2'] },
      ];
      expect(
        fileColumns.findMatchingInputDataItem(['COL1', 'COL2', 'EXTRA'])?.keyName
      ).toBe('k1');
      expect(fileColumns.findMatchingInputDataItem(['COL1'])).toBeNull();
    });
  });

  describe('validateUploadedFilesAgainstDepot()', () => {
    it('resolves immediately when there are no uploaded files', async () => {
      files.preOrderFiles = [];
      await fileColumns.validateUploadedFilesAgainstDepot();
      expect(files.preOrderFiles).toEqual([]);
    });
  });
});
