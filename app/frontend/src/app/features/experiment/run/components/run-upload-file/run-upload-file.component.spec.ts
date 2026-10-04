import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ConstraintService } from '../../../services/constraint.service';
import { ExperimentService } from '../../../services/experiment.service';
import { PreOrderService } from '../../../services/pre-order.service';
import { ExperimentStatus, Run, UploadPreOrderResponse } from '../../../models/experiment.model';
import { FileWithCategory } from '../../../models/pre-order.model';
import { RunUploadFileComponent } from './run-upload-file.component';
import { RunStateService } from '../../services/run-state.service';
import { RunUploadFileService } from '../../services/run-upload-file.service';
import { RunFileIntakeService } from '../../services/run-file-intake.service';
import {
  configureRunPage,
  createExperiment,
  createMyDepot,
  createFile,
  createFileDescriptorItem,
} from '../../testing/run-page.testing';

describe('RunUploadFileComponent', () => {
  let component: RunUploadFileComponent;
  let state: RunStateService;
  let files: RunUploadFileService;
  let fileIntake: RunFileIntakeService;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let constraintServiceSpy: jasmine.SpyObj<ConstraintService>;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let preOrderServiceSpy: jasmine.SpyObj<PreOrderService>;

  beforeEach(async () => {
    ({
      spinnerSpy,
      constraintServiceSpy,
      experimentServiceSpy,
      ngbModalSpy,
      toastrSpy,
      preOrderServiceSpy,
    } = await configureRunPage({ declarations: [RunUploadFileComponent] }));
    component = TestBed.createComponent(RunUploadFileComponent).componentInstance;
    state = TestBed.inject(RunStateService);
    files = TestBed.inject(RunUploadFileService);
    fileIntake = TestBed.inject(RunFileIntakeService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resetFileInput() / deleteFileInList()', () => {
    it('resetFileInput() clears the input element value', () => {
      const input = document.createElement('input');
      input.value = 'C:\\fakepath\\file.xlsx';
      component.resetFileInput({ target: input } as unknown as Event);
      expect(input.value).toBe('');
    });

    it('deleteFileInList() blocks deletion for non-Original experiments still awaiting upload completion', () => {
      state.experiment = createExperiment({
        run: Run.Rerun,
        status: ExperimentStatus.Succeeded,
      });
      files.preOrderFiles = [createFileDescriptorItem('a')];
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
      } as unknown as NgbModalRef);

      component.deleteFileInList(0);

      expect(toastrSpy.warning).toHaveBeenCalled();
      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(files.preOrderFiles.length).toBe(1);
    });

    it('deleteFileInList() removes the file for an Original experiment', fakeAsync(() => {
      state.experiment = createExperiment({ run: Run.Original });
      files.preOrderFiles = [createFileDescriptorItem('a')];

      component.deleteFileInList(0);
      tick(1000);

      expect(files.preOrderFiles.length).toBe(0);
      expect(spinnerSpy.show).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));
  });

  describe('onFileSelected()', () => {
    it('rejects non-excel file types and does not call uploadFile', () => {
      spyOn(fileIntake, 'uploadFile');
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {
        value: [createFile('bad.txt', 'text/plain')],
      });
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
      } as unknown as NgbModalRef);

      component.onFileSelected({ target: input } as unknown as Event);

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(fileIntake.uploadFile).not.toHaveBeenCalled();
    });

    it('warns and uses only the first file when multiple files are selected', () => {
      spyOn(fileIntake, 'uploadFile');
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {
        value: [
          createFile('a.xlsx', 'application/vnd.ms-excel'),
          createFile('b.xlsx', 'application/vnd.ms-excel'),
        ],
      });

      component.onFileSelected({ target: input } as unknown as Event);

      expect(toastrSpy.warning).toHaveBeenCalled();
      expect(fileIntake.uploadFile).toHaveBeenCalled();
    });

    it('does nothing when no files are present', () => {
      spyOn(fileIntake, 'uploadFile');
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [] });

      component.onFileSelected({ target: input } as unknown as Event);

      expect(fileIntake.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('handleUploadSubmit()', () => {
    beforeEach(() => {
      state.experiment = createExperiment();
      files.preOrderFiles = [
        {
          id: 'f1',
          file: createFile(
            'a.xlsx',
            'application/vnd.ms-excel'
          ) as FileWithCategory,
        },
      ];
    });

    it('uploads and refreshes the experiment on confirmation', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      const uploadResponse: UploadPreOrderResponse = {
        name: 'Test Run',
        result: { isSuccesses: true },
      };
      preOrderServiceSpy.uploadPreOrder.and.returnValue(of(uploadResponse));
      experimentServiceSpy.getExperiment.and.returnValue(
        of(createExperiment({ name: 'Test Run' }))
      );
      constraintServiceSpy.getDynamicParameters.and.returnValue(of([]));

      component.handleUploadSubmit();
      tick();

      expect(preOrderServiceSpy.uploadPreOrder).toHaveBeenCalled();
      expect(toastrSpy.success).toHaveBeenCalled();
      expect(state.isFilePreview).toBeFalse();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('hides the spinner and logs when the upload request fails', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      preOrderServiceSpy.uploadPreOrder.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.handleUploadSubmit();
      tick();

      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('does nothing when the confirmation dialog is dismissed', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.reject('dismissed'),
      } as unknown as NgbModalRef);

      component.handleUploadSubmit();
      tick();

      expect(preOrderServiceSpy.uploadPreOrder).not.toHaveBeenCalled();
    }));
  });

  describe('onDepotSelectionChange()', () => {
    it('updates depot-scoped state and revalidates uploaded files', async () => {
      const depotA = createMyDepot({ depotName: 'Depot A' });
      const depotB = createMyDepot({
        depotName: 'Depot B',
        inputdata: [
          {
            companyName: 'Acme',
            depotId: 'depot-1',
            keyName: 'k1',
            displayName: 'Category A',
            columnRequired: [],
            fileFormatType: 'xlsx',
            required: false,
            createdAt: '',
            modifiedAt: '',
          },
        ],
      });
      state.depots = [depotA, depotB];
      state.selectedDepotIdName = 'Depot B';

      await component.onDepotSelectionChange();

      expect(files.inputDataKeys).toEqual(['Category A']);
    });

    it('clears input data keys when no depot matches the selection', async () => {
      state.depots = [createMyDepot({ depotName: 'Depot A' })];
      state.selectedDepotIdName = 'Unknown depot';

      await component.onDepotSelectionChange();

      expect(files.inputDataKeys).toEqual([]);
      expect((files as any).depotInputDataItems).toEqual([]);
    });
  });
});
