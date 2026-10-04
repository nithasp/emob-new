import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, of } from 'rxjs';
import { UserService } from '@core/services/auth/user.service';
import { VehicleService } from '@features/configurations/services/vehicle.service';
import { ConstraintService } from '../services/constraint.service';
import { ExperimentService } from '../services/experiment.service';
import { ExperimentStatus } from '../models/experiment.model';
import { RunComponent } from './run.component';
import { RunStateService } from './services/run-state.service';
import { RunUiService } from './services/run-ui.service';
import { configureRunPage, createExperiment } from './testing/run-page.testing';

describe('RunComponent', () => {
  let component: RunComponent;
  let fixture: ComponentFixture<RunComponent>;
  let state: RunStateService;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let constraintServiceSpy: jasmine.SpyObj<ConstraintService>;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let routerSpy: jasmine.SpyObj<Router>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let vehicleServiceSpy: jasmine.SpyObj<VehicleService>;
  let paramsSubject: Subject<{ [key: string]: string }>;

  beforeEach(async () => {
    ({
      spinnerSpy,
      constraintServiceSpy,
      experimentServiceSpy,
      ngbModalSpy,
      routerSpy,
      userServiceSpy,
      vehicleServiceSpy,
      paramsSubject,
    } = await configureRunPage({ declarations: [RunComponent] }));
    fixture = TestBed.createComponent(RunComponent);
    component = fixture.componentInstance;
    state = fixture.debugElement.injector.get(RunStateService);
    spyOn(fixture.debugElement.injector.get(RunUiService), 'detectChanges');
  });

  afterEach(() => {
    document.getElementById('popup')?.remove();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit()', () => {
    it('shows the spinner', () => {
      component.ngOnInit();
      expect(spinnerSpy.show).toHaveBeenCalled();
    });
  });

  describe('ngAfterViewInit()', () => {
    beforeEach(() => {
      history.replaceState({ isCreateMode: false }, '');
      document.body.insertAdjacentHTML('beforeend', '<div id="popup"></div>');
      vehicleServiceSpy.getMyVehicleTypes.and.returnValue(of([]));
      experimentServiceSpy.getMyCompany.and.returnValue(
        of({ companyName: 'Acme', depotType: 'x' })
      );
      experimentServiceSpy.getMyDepots.and.returnValue(of([]));
    });

    it('loads vehicle types then the experiment, and skips straight to file preview when there is no historical input data', fakeAsync(() => {
      userServiceSpy.getUserId.and.returnValue(of('user-1'));
      constraintServiceSpy.getDynamicParameters.and.returnValue(of([]));
      const experiment = createExperiment({
        triggeredBy: 'user-1',
        status: ExperimentStatus.Initializing,
        inputdata: [],
      });
      experimentServiceSpy.getExperiment.and.returnValue(of(experiment));

      component.ngAfterViewInit();
      tick(100);

      paramsSubject.next({ runId: 'run-1' });
      tick();

      expect(experimentServiceSpy.getExperiment).toHaveBeenCalledWith('run-1');
      expect(state.experiment.runId).toBe('run-1');
      expect(state.isFilePreview).toBeTrue();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('shows a confirmation dialog and navigates away when the experiment is in a terminal status', fakeAsync(() => {
      const experiment = createExperiment({ status: ExperimentStatus.Failed });
      experimentServiceSpy.getExperiment.and.returnValue(of(experiment));
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);

      component.ngAfterViewInit();
      tick(100);

      paramsSubject.next({ runId: 'run-1' });
      tick();

      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users/experiments']);
    }));
  });
});
