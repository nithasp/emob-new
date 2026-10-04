import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { RunFileIntakeService } from './run-file-intake.service';
import { RunStateService } from './run-state.service';
import { RunUploadFileService } from './run-upload-file.service';
import { RunFileColumnService } from './run-file-column.service';
import { configureRunPage, createFile, createFileDescriptorItem } from '../testing/run-page.testing';

describe('RunFileIntakeService', () => {
  let state: RunStateService;
  let files: RunUploadFileService;
  let fileColumns: RunFileColumnService;
  let fileIntake: RunFileIntakeService;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;

  beforeEach(async () => {
    ({ ngbModalSpy } = await configureRunPage());
    state = TestBed.inject(RunStateService);
    files = TestBed.inject(RunUploadFileService);
    fileColumns = TestBed.inject(RunFileColumnService);
    fileIntake = TestBed.inject(RunFileIntakeService);
  });

  it('should create', () => {
    expect(fileIntake).toBeTruthy();
  });

  describe('uploadFile()', () => {
    it('adds a new file directly when there is no conflicting category', fakeAsync(() => {
      spyOn(fileColumns, 'validateSingleFileAgainstDepot').and.returnValue(
        Promise.resolve({
          isValid: true,
          keyName: 'k1',
          displayName: 'Category A',
          columnNames: [],
        })
      );
      const file = createFile('new.xlsx', 'application/vnd.ms-excel');

      fileIntake.uploadFile(file);
      tick();

      expect(files.preOrderFiles.length).toBe(1);
      expect(files.preOrderFiles[0].file.displayName).toBe('Category A');
      expect(state.isFilePreview).toBeTrue();
    }));

    it('does nothing when validation against the depot fails', fakeAsync(() => {
      spyOn(fileColumns, 'validateSingleFileAgainstDepot').and.returnValue(
        Promise.resolve({ isValid: false })
      );
      const file = createFile('new.xlsx', 'application/vnd.ms-excel');

      fileIntake.uploadFile(file);
      tick();

      expect(files.preOrderFiles.length).toBe(0);
    }));

    it('prompts a replace-confirmation dialog when a file of the same category already exists', fakeAsync(() => {
      const existing = createFileDescriptorItem('existing', {
        keyName: 'k1',
        displayName: 'Category A',
      });
      files.preOrderFiles = [existing];
      spyOn(fileColumns, 'validateSingleFileAgainstDepot').and.returnValue(
        Promise.resolve({
          isValid: true,
          keyName: 'k1',
          displayName: 'Category A',
          columnNames: [],
        })
      );
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve({ replace: true }),
      } as unknown as NgbModalRef);
      const file = createFile('replacement.xlsx', 'application/vnd.ms-excel');

      fileIntake.uploadFile(file);
      tick();

      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(files.preOrderFiles[0].file.name).toBe('replacement.xlsx');
    }));
  });
});
