import { TestBed } from '@angular/core/testing';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ExperimentService } from '../../services/experiment.service';
import { TransformWarning } from '../../models/experiment.model';
import { FileWithCategory } from '../../models/pre-order.model';
import { RunUploadFileService } from './run-upload-file.service';
import { RunStateService } from './run-state.service';
import {
  configureRunPage,
  createMyDepot,
  createFile,
  createFileDescriptorItem,
} from '../testing/run-page.testing';

describe('RunUploadFileService', () => {
  let state: RunStateService;
  let files: RunUploadFileService;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    ({ spinnerSpy, experimentServiceSpy, toastrSpy } = await configureRunPage());
    state = TestBed.inject(RunStateService);
    files = TestBed.inject(RunUploadFileService);
  });

  it('should create', () => {
    expect(files).toBeTruthy();
  });

  describe('requiredFileTypes / isFileTypeRequired / isFileTypeAlreadyAdded', () => {
    beforeEach(() => {
      (files as any).depotInputDataItems = [
        {
          keyName: 'k1',
          displayName: 'Category A',
          columnRequired: [],
          required: true,
        },
        {
          keyName: 'k2',
          displayName: 'Category B',
          columnRequired: [],
          required: false,
        },
      ];
    });

    it('requiredFileTypes returns the display names', () => {
      expect(files.requiredFileTypes).toEqual([
        'Category A',
        'Category B',
      ]);
    });

    it('isFileTypeRequired() reflects the matching item, false when missing', () => {
      expect(files.isFileTypeRequired('Category A')).toBeTrue();
      expect(files.isFileTypeRequired('Category B')).toBeFalse();
      expect(files.isFileTypeRequired('Unknown')).toBeFalse();
    });

    it('isFileTypeAlreadyAdded() checks preOrderFiles by displayName', () => {
      files.preOrderFiles = [
        createFileDescriptorItem('f1', { displayName: 'Category A' }),
      ];
      expect(files.isFileTypeAlreadyAdded('Category A')).toBeTrue();
      expect(files.isFileTypeAlreadyAdded('Category B')).toBeFalse();
    });
  });

  describe('duplicate-file / warning helpers', () => {
    it('hasDuplicateCategory() flags files sharing a displayName', () => {
      const a = createFileDescriptorItem('a', { displayName: 'Category A' });
      const b = createFileDescriptorItem('b', { displayName: 'Category A' });
      files.preOrderFiles = [a, b];
      expect(files.hasDuplicateCategory(a)).toBeTrue();

      files.preOrderFiles = [a];
      expect(files.hasDuplicateCategory(a)).toBeFalse();
    });

    it('hasDuplicateFileName()/hasDuplicateFileSize() require matching name (and size)', () => {
      const a = createFileDescriptorItem('a', { name: 'same.xlsx', size: 10 });
      const b = createFileDescriptorItem('b', { name: 'same.xlsx', size: 10 });
      const c = createFileDescriptorItem('c', { name: 'same.xlsx', size: 99 });
      files.preOrderFiles = [a, b, c];

      expect(files.hasDuplicateFileName(a)).toBeTrue();
      expect(files.hasDuplicateFileSize(a)).toBeTrue();
      expect(files.hasDuplicateFileSize(c)).toBeFalse();
    });

    it('getFileWarningMessages()/hasFileWarning() report duplicate name/size', () => {
      const a = createFileDescriptorItem('a', { name: 'same.xlsx', size: 10 });
      const b = createFileDescriptorItem('b', { name: 'same.xlsx', size: 10 });
      files.preOrderFiles = [a, b];

      expect(files.hasFileWarning(a)).toBeTrue();
      expect(files.getFileWarningMessages(a).length).toBe(2);
    });

    it('getAllErrorMessages() combines warning and duplicate-category messages', () => {
      const a = createFileDescriptorItem('a', {
        name: 'same.xlsx',
        size: 10,
        displayName: 'Category A',
      });
      const b = createFileDescriptorItem('b', {
        name: 'same.xlsx',
        size: 10,
        displayName: 'Category A',
      });
      files.preOrderFiles = [a, b];

      const message = files.getAllErrorMessages(a);
      expect(message.length).toBeGreaterThan(0);
      expect(message.split(', ').length).toBe(3); // dup name + dup size + dup category
    });

    it('hasAnyDuplicateCategories() reflects whether any file has a duplicate category', () => {
      const a = createFileDescriptorItem('a', { displayName: 'Category A' });
      const b = createFileDescriptorItem('b', { displayName: 'Category A' });
      files.preOrderFiles = [a, b];
      expect(files.hasAnyDuplicateCategories()).toBeTrue();

      files.preOrderFiles = [a];
      expect(files.hasAnyDuplicateCategories()).toBeFalse();
    });
  });

  describe('isFileWithCategory() / findMatchingInputDataItem()', () => {
    it('distinguishes real File objects from plain descriptors', () => {
      expect(
        files.isFileWithCategory(
          createFile('a.xlsx', 'application/vnd.ms-excel')
        )
      ).toBeTrue();
      expect(
        files.isFileWithCategory({
          keyName: 'k1',
          name: 'a.xlsx',
        } as unknown as FileWithCategory)
      ).toBeFalse();
      expect(files.isFileWithCategory(null)).toBeFalse();
    });
  });

  describe('updateInputDataKeysFromDepot() / updateCanUploadState()', () => {
    it('updateInputDataKeysFromDepot() dedupes by keyName and updates canUpload state', () => {
      const depot = createMyDepot({
        inputdata: [
          {
            companyName: 'Acme',
            depotId: 'depot-1',
            keyName: 'k1',
            displayName: 'Category A',
            columnRequired: ['COL1'],
            fileFormatType: 'xlsx',
            required: true,
            createdAt: '',
            modifiedAt: '',
          },
          {
            companyName: 'Acme',
            depotId: 'depot-1',
            keyName: 'k1',
            displayName: 'Category A (dup)',
            columnRequired: ['COL1'],
            fileFormatType: 'xlsx',
            required: true,
            createdAt: '',
            modifiedAt: '',
          },
        ],
      });

      files.updateInputDataKeysFromDepot(depot);

      expect(files.inputDataKeys.length).toBe(1);
      expect(files.canUpload).toBeFalse(); // no files uploaded yet
    });

    it('updateCanUploadState() requires all required categories to be present, ignores optional ones', () => {
      (files as any).depotInputDataItems = [
        {
          keyName: 'k1',
          displayName: 'Category A',
          columnRequired: [],
          required: true,
        },
        {
          keyName: 'k2',
          displayName: 'Category B',
          columnRequired: [],
          required: false,
        },
      ];
      files.preOrderFiles = [];
      files.updateCanUploadState();
      expect(files.canUpload).toBeFalse();

      files.preOrderFiles = [
        createFileDescriptorItem('f1', { displayName: 'Category A' }),
      ];
      files.updateCanUploadState();
      expect(files.canUpload).toBeTrue();
    });

    it('updateCanUploadState() blocks upload when categories are duplicated', () => {
      (files as any).depotInputDataItems = [
        {
          keyName: 'k1',
          displayName: 'Category A',
          columnRequired: [],
          required: false,
        },
      ];
      files.preOrderFiles = [
        createFileDescriptorItem('a', { displayName: 'Category A' }),
        createFileDescriptorItem('b', { displayName: 'Category A' }),
      ];
      files.updateCanUploadState();
      expect(files.canUpload).toBeFalse();
    });
  });

  describe('transform warnings', () => {
    it('setTransformWarnings() dedupes details sharing the same input, defaults collapse states to collapsed', () => {
      const warnings: TransformWarning[] = [
        {
          title: 'products',
          detail: [
            { input: 'A', type: 't1' },
            { input: 'A', type: 't1' },
            { input: 'B', type: 't1' },
          ],
        },
      ];
      files.setTransformWarnings(warnings);
      expect(files.transformWarnings[0].detail.length).toBe(2);
      expect(files.transformWarningCollapseStates).toEqual([true]);
    });

    it('toggleTransformWarningCollapse() flips the state at the given index', () => {
      files.transformWarningCollapseStates = [true];
      files.toggleTransformWarningCollapse(0);
      expect(files.transformWarningCollapseStates[0]).toBeFalse();
    });

    it('getWarningTitle() maps known titles, passes through unknown ones', () => {
      expect(files.getWarningTitle('unknown_title')).toBe('unknown_title');
      expect(files.getWarningTitle('products')).not.toBe('');
    });
  });

  describe('getMyDepots()', () => {
    it('loads company + depots and initializes selection state', () => {
      const depot = createMyDepot({ depotName: 'Depot X' });
      experimentServiceSpy.getMyCompany.and.returnValue(
        of({ companyName: 'Acme', depotType: 'multi' })
      );
      experimentServiceSpy.getMyDepots.and.returnValue(of([depot]));

      files.getMyDepots(true);

      expect(state.companyDepotType).toBe('multi');
      expect(state.depots.length).toBe(1);
      expect(state.selectedDepotIdName).toBe('Depot X');
      expect(spinnerSpy.show).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    });

    it('shows an error toast and hides the spinner when depots fail to load', () => {
      experimentServiceSpy.getMyCompany.and.returnValue(
        of({ companyName: 'Acme', depotType: 'x' })
      );
      experimentServiceSpy.getMyDepots.and.returnValue(
        throwError(() => new Error('failed'))
      );

      files.getMyDepots(true);

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    });
  });
});
