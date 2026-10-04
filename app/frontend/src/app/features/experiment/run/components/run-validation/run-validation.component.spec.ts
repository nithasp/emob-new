import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ExportFileService } from '@shared/services/export-file.service';
import { ExperimentService } from '../../../services/experiment.service';
import { Experiment, Validate } from '../../../models/experiment.model';
import { RunValidationComponent } from './run-validation.component';
import { RunStateService } from '../../services/run-state.service';
import { configureRunPage, createExperiment, createCustomer } from '../../testing/run-page.testing';

describe('RunValidationComponent', () => {
  let component: RunValidationComponent;
  let state: RunStateService;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let exportServiceSpy: jasmine.SpyObj<ExportFileService>;

  beforeEach(async () => {
    ({
      spinnerSpy,
      experimentServiceSpy,
      ngbModalSpy,
      toastrSpy,
      routerSpy,
      exportServiceSpy,
    } = await configureRunPage({ declarations: [RunValidationComponent] }));
    component = TestBed.createComponent(RunValidationComponent).componentInstance;
    state = TestBed.inject(RunStateService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('routePlanning()', () => {
    beforeEach(() => {
      state.experiment = createExperiment();
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
    });

    it('submits the experiment and navigates to the experiments list on success', fakeAsync(() => {
      experimentServiceSpy.submitExperiment.and.returnValue(
        of({} as Experiment)
      );

      component.routePlanning();
      tick();

      expect(experimentServiceSpy.submitExperiment).toHaveBeenCalledWith(
        'run-1'
      );
      expect(toastrSpy.success).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users/experiments']);
      expect(spinnerSpy.hide).toHaveBeenCalledWith('run');
    }));

    it('shows an error toast when submission fails', fakeAsync(() => {
      experimentServiceSpy.submitExperiment.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.routePlanning();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('exportValidationData()', () => {
    it('exports zero-weight and invalid-coordinate rows as CSV', () => {
      state.experiment = createExperiment();
      state.validateExperiment = {
        filters: {
          constraints: { over_distance: [], over_weight: [] },
          order_data: { invalid_coordinate: [createCustomer()] },
        },
        warning: { zero_weight: [createCustomer()] },
      } as unknown as Validate;

      component.exportValidationData();

      expect(exportServiceSpy.exportMultipleCsv).toHaveBeenCalled();
      const [dataArrays, names] =
        exportServiceSpy.exportMultipleCsv.calls.mostRecent().args;
      expect(dataArrays.length).toBe(2);
      expect(names.length).toBe(2);
    });
  });
});
