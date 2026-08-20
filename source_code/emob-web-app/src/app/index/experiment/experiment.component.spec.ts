import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';

import { ExperimentComponent } from './experiment.component';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ConstraintService } from 'src/app/services/constraint.service';
import { UserMSGraphService } from 'src/app/services/user.service';
import { Experiment, ExperimentState } from 'src/app/models/experiment.model';

function createMockExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    companyName: 'ACME',
    runId: 'run-1',
    name: 'Experiment 1',
    timestamp: '2024-01-01T00:00:00Z',
    configurations: [],
    inputdata: [],
    depots: [],
    timeStart: null,
    timeEnd: null,
    timeDuration: null,
    triggeredBy: 'user-1',
    triggeredByName: 'User One',
    status: 'Succeeded' as Experiment['status'],
    run: 'Original' as Experiment['run'],
    groupId: 'group-1',
    countGeocoding: 0,
    countReroute: 0,
    fileUrls: {
      transform: { locations: null, warning: null },
      validate: {
        parameterFormats: null,
        vehicleTypes: null,
        preVRPSolution: null,
        errorWarning: null,
      },
      plan: { vrpSolutionLean: null, geoJson: null, vrpStats: null },
    },
    ...overrides,
  };
}

/** Builds an NgbModalRef-like stub with a controllable result promise. */
function createModalRef(result: Promise<unknown>): NgbModalRef {
  return {
    componentInstance: {},
    result,
  } as unknown as NgbModalRef;
}

describe('ExperimentComponent', () => {
  let component: ExperimentComponent;
  let fixture: ComponentFixture<ExperimentComponent>;

  let experimentService: jasmine.SpyObj<ExperimentService>;
  let constraintService: jasmine.SpyObj<ConstraintService>;
  let spinner: jasmine.SpyObj<NgxSpinnerService>;
  let router: jasmine.SpyObj<Router>;
  let ngbModal: jasmine.SpyObj<NgbModal>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let userMsGraphService: jasmine.SpyObj<UserMSGraphService>;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    experimentService = jasmine.createSpyObj<ExperimentService>(
      'ExperimentService',
      [
        'getExperiments',
        'createExperiment',
        'rerunExperiment',
        'replicateExperiment',
        'cancelExperiment',
      ]
    );
    constraintService = jasmine.createSpyObj<ConstraintService>(
      'ConstraintService',
      ['getDynamicParameter']
    );
    spinner = jasmine.createSpyObj<NgxSpinnerService>('NgxSpinnerService', [
      'show',
      'hide',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    ngbModal = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'info',
      'success',
      'warning',
      'error',
    ]);
    userMsGraphService = jasmine.createSpyObj<UserMSGraphService>(
      'UserMSGraphService',
      ['getUserId']
    );
    transloco = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
    ]);

    // Default return values to keep ngOnInit happy.
    experimentService.getExperiments.and.returnValue(of([]));
    transloco.translate.and.callFake(((key: string) => key) as never);
    router.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      declarations: [ExperimentComponent],
      providers: [
        { provide: ExperimentService, useValue: experimentService },
        { provide: ConstraintService, useValue: constraintService },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: Router, useValue: router },
        { provide: NgbModal, useValue: ngbModal },
        { provide: ToastrService, useValue: toastr },
        { provide: UserMSGraphService, useValue: userMsGraphService },
        { provide: TranslocoService, useValue: transloco },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Replace the template so we don't pull in transloco pipes/material deps.
      .overrideComponent(ExperimentComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ExperimentComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.stopPolling();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit / loadData', () => {
    it('should load displayed columns and data on init', fakeAsync(() => {
      const experiments = [createMockExperiment()];
      experimentService.getExperiments.and.returnValue(of(experiments));

      component.ngOnInit();
      tick(500); // hiddenSpinner() hides the named spinner after a 500ms delay

      expect(experimentService.getExperiments).toHaveBeenCalled();
      expect(component.dataSource.data).toEqual(experiments);
      expect(spinner.hide).toHaveBeenCalledWith('experiment');
    }));

    it('should hide the spinner when loading data fails', fakeAsync(() => {
      experimentService.getExperiments.and.returnValue(
        throwError(() => new Error('network error'))
      );

      component.loadData();
      tick(500); // hiddenSpinner() hides the named spinner after a 500ms delay

      expect(spinner.hide).toHaveBeenCalledWith('experiment');
    }));
  });

  describe('displayed columns persistence', () => {
    it('should return only visible columns', () => {
      const visible = component.getDisplayedColumns();
      expect(visible).toContain('select');
      expect(visible).toContain('Name');
      expect(visible).not.toContain('RunId');
      expect(visible).not.toContain('GroupId');
    });

    it('should persist visible columns to localStorage', () => {
      component.saveDisplayedColumns();

      const stored = JSON.parse(
        localStorage.getItem(component.columnsStorageKey) as string
      );
      expect(stored).toContain('Name');
      expect(stored).not.toContain('RunId');
    });

    it('should restore column visibility from localStorage', () => {
      localStorage.setItem(
        component.columnsStorageKey,
        JSON.stringify(['Name'])
      );

      component.loadDisplayedColumns();

      const nameCol = component.displayedColumns.find((c) => c.def === 'Name');
      const selectCol = component.displayedColumns.find(
        (c) => c.def === 'select'
      );
      expect(nameCol?.visible).toBeTrue();
      expect(selectCol?.visible).toBeFalse();
    });
  });

  describe('selection helpers', () => {
    it('should produce a select label for an unselected row', () => {
      const row = createMockExperiment();
      expect(component.checkboxLabel(row)).toBe('select row ');
    });

    it('should produce a deselect label for a selected row', () => {
      const row = createMockExperiment();
      component.selection.select(row);
      expect(component.checkboxLabel(row)).toBe('deselect row ');
    });

    it('should compare selected status value', () => {
      expect(component.isSelectedStatusValue('Succeeded')).toBeFalse();

      component.selection.select(
        createMockExperiment({ status: 'Succeeded' as Experiment['status'] })
      );

      expect(component.isSelectedStatusValue('Succeeded')).toBeTrue();
      expect(component.isSelectedStatusValue('Failed')).toBeFalse();
    });
  });

  describe('applyFilter', () => {
    it('should set a trimmed lowercase filter on the data source', () => {
      const event = {
        target: { value: '  HELLO  ' },
      } as unknown as Event;

      component.applyFilter(event);

      expect(component.dataSource.filter).toBe('hello');
    });
  });

  describe('polling', () => {
    it('should reload data on the polling interval', fakeAsync(() => {
      experimentService.getExperiments.calls.reset();

      component.startPolling();
      tick(45000);
      expect(experimentService.getExperiments).toHaveBeenCalledTimes(1);

      tick(45000);
      expect(experimentService.getExperiments).toHaveBeenCalledTimes(2);

      component.stopPolling();
      tick(45000);
      expect(experimentService.getExperiments).toHaveBeenCalledTimes(2);
    }));

    it('should clear the timer on stopPolling', () => {
      component.startPolling();
      expect(component.pollingTimer).not.toBeNull();

      component.stopPolling();
      expect(component.pollingTimer).toBeNull();
    });

    it('should stop polling when the document becomes hidden', () => {
      const stopSpy = spyOn(component, 'stopPolling').and.callThrough();
      const startSpy = spyOn(component, 'startPolling').and.callThrough();
      spyOnProperty(document, 'hidden', 'get').and.returnValue(true);

      component.onVisibilityChange();

      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).not.toHaveBeenCalled();
    });

    it('should start polling when the document becomes visible', () => {
      const startSpy = spyOn(component, 'startPolling').and.callThrough();
      spyOnProperty(document, 'hidden', 'get').and.returnValue(false);

      component.onVisibilityChange();

      expect(startSpy).toHaveBeenCalled();
      component.stopPolling();
    });

    it('should stop polling on destroy', () => {
      const stopSpy = spyOn(component, 'stopPolling').and.callThrough();
      component.ngOnDestroy();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('createNewExperiment', () => {
    it('should create an experiment and navigate when confirmed', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      experimentService.createExperiment.and.returnValue(
        of(createMockExperiment({ runId: 'new-run' }))
      );

      component.createNewExperiment();
      tick();

      expect(experimentService.createExperiment).toHaveBeenCalled();
      expect(toastr.info).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/users/run', 'new-run'],
        { state: { isCreateMode: true } }
      );
    }));

    it('should not create an experiment when cancelled', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(false)));

      component.createNewExperiment();
      tick();

      expect(experimentService.createExperiment).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('getParameter', () => {
    it('should open the parameters dialog on success', fakeAsync(() => {
      const params = [{ key: 'a' }] as never[];
      constraintService.getDynamicParameter.and.returnValue(of(params));
      const openSpy = spyOn(component, 'openParametersDialog');

      component.getParameter('run-1');
      tick(500); // hiddenSpinner() hides the named spinner after a 500ms delay

      expect(constraintService.getDynamicParameter).toHaveBeenCalledWith(
        'run-1'
      );
      expect(spinner.hide).toHaveBeenCalledWith('experiment');
      expect(openSpy).toHaveBeenCalledWith(params);
    }));

    it('should show an error toast when loading parameters fails', fakeAsync(() => {
      constraintService.getDynamicParameter.and.returnValue(
        throwError(() => new Error('boom'))
      );

      component.getParameter('run-1');
      tick(500); // hiddenSpinner() hides the named spinner after a 500ms delay

      expect(spinner.hide).toHaveBeenCalledWith('experiment');
      expect(toastr.error).toHaveBeenCalled();
    }));
  });

  describe('getConsumption', () => {
    it('should map consumption counts and open the dialog', fakeAsync(() => {
      const openSpy = spyOn(component, 'openConsumptionDialog');
      const experiment = createMockExperiment({
        countGeocoding: 5,
        countReroute: 3,
      });

      component.getConsumption(experiment);
      tick(500); // hiddenSpinner() hides the named spinner after a 500ms delay

      expect(component.paramsConsumption.countGeocoding).toBe(5);
      expect(component.paramsConsumption.countReroute).toBe(3);
      expect(openSpy).toHaveBeenCalledWith('');
      expect(spinner.hide).toHaveBeenCalledWith('experiment');
    }));

    it('should default missing counts to zero', () => {
      spyOn(component, 'openConsumptionDialog');
      const experiment = createMockExperiment({
        countGeocoding: undefined as unknown as number,
        countReroute: undefined as unknown as number,
      });

      component.getConsumption(experiment);

      expect(component.paramsConsumption.countGeocoding).toBe(0);
      expect(component.paramsConsumption.countReroute).toBe(0);
    });
  });

  describe('dialog openers', () => {
    it('should configure the parameters dialog instance', () => {
      const modalRef = createModalRef(Promise.reject());
      ngbModal.open.and.returnValue(modalRef);

      component.openParametersDialog([{ key: 'x' }] as never[]);

      expect(ngbModal.open).toHaveBeenCalled();
      expect(
        (modalRef.componentInstance as { dynamicParameters: unknown[] })
          .dynamicParameters
      ).toEqual([{ key: 'x' }] as never[]);
    });

    it('should configure the consumption dialog instance', () => {
      const modalRef = createModalRef(Promise.reject());
      ngbModal.open.and.returnValue(modalRef);
      component.paramsConsumption = { countGeocoding: 1, countReroute: 2 };

      component.openConsumptionDialog('lg');

      expect(ngbModal.open).toHaveBeenCalled();
      expect(
        (modalRef.componentInstance as { paramsConsumption: unknown })
          .paramsConsumption
      ).toEqual({ countGeocoding: 1, countReroute: 2 });
    });

    it('should configure and return the confirmation dialog', () => {
      const modalRef = createModalRef(Promise.reject());
      ngbModal.open.and.returnValue(modalRef);

      const result = component.openConfirmDialog(
        'title',
        'message',
        'question',
        'Yes',
        false
      );

      const instance = modalRef.componentInstance as Record<string, unknown>;
      expect(instance['title']).toBe('title');
      expect(instance['message']).toBe('message');
      expect(instance['question']).toBe('question');
      expect(instance['acceptButton']).toBe('Yes');
      expect(instance['disableCancelButton']).toBeFalse();
      expect(result).toBe(modalRef);
    });
  });

  describe('retryExperiment', () => {
    it('should rerun the experiment when confirmed', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      experimentService.rerunExperiment.and.returnValue(
        of({ message: 'ok' } as unknown as ExperimentState)
      );

      component.retryExperiment(createMockExperiment({ runId: 'r1' }));
      tick();

      expect(experimentService.rerunExperiment).toHaveBeenCalledWith('r1');
      expect(toastr.success).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
    }));

    it('should not rerun when cancelled', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(false)));

      component.retryExperiment(createMockExperiment());
      tick();

      expect(experimentService.rerunExperiment).not.toHaveBeenCalled();
    }));
  });

  describe('tryToRerunExperiment', () => {
    it('should replicate the experiment and navigate when confirmed', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      experimentService.replicateExperiment.and.returnValue(
        of(createMockExperiment({ runId: 'replica' }))
      );

      component.tryToRerunExperiment(createMockExperiment({ runId: 'r1' }));
      tick();

      expect(experimentService.replicateExperiment).toHaveBeenCalledWith('r1');
      expect(toastr.success).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/users/run', 'replica']);
    }));

    it('should do nothing when cancelled', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(false)));

      component.tryToRerunExperiment(createMockExperiment());
      tick();

      expect(experimentService.replicateExperiment).not.toHaveBeenCalled();
    }));
  });

  describe('cancelExperiment', () => {
    it('should cancel the experiment when confirmed', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      experimentService.cancelExperiment.and.returnValue(
        of({ message: 'cancelled' } as unknown as ExperimentState)
      );

      component.cancelExperiment(createMockExperiment({ runId: 'r1' }));
      tick();

      expect(experimentService.cancelExperiment).toHaveBeenCalledWith('r1');
      expect(toastr.info).toHaveBeenCalled();
    }));

    it('should not cancel when declined', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(false)));

      component.cancelExperiment(createMockExperiment());
      tick();

      expect(experimentService.cancelExperiment).not.toHaveBeenCalled();
    }));
  });

  describe('selectExperiment', () => {
    it('should navigate to result when status is Succeeded', () => {
      component.selectExperiment(
        createMockExperiment({
          runId: 'r1',
          status: 'Succeeded' as Experiment['status'],
        })
      );

      expect(router.navigate).toHaveBeenCalledWith(['/users/result', 'r1']);
    });

    it('should open the run when Initializing and current user is the creator', () => {
      userMsGraphService.getUserId.and.returnValue(of('user-1'));

      component.selectExperiment(
        createMockExperiment({
          runId: 'r1',
          status: 'Initializing' as Experiment['status'],
          triggeredBy: 'user-1',
        })
      );

      expect(router.navigate).toHaveBeenCalledWith(['/users/run', 'r1']);
      expect(toastr.info).toHaveBeenCalled();
    });

    it('should warn when Initializing and current user is not the creator', () => {
      userMsGraphService.getUserId.and.returnValue(of('other-user'));
      const confirmSpy = spyOn(component, 'openConfirmDialog');

      component.selectExperiment(
        createMockExperiment({
          runId: 'r1',
          status: 'Initializing' as Experiment['status'],
          triggeredBy: 'user-1',
        })
      );

      expect(router.navigate).not.toHaveBeenCalled();
      expect(toastr.warning).toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should warn when the experiment is in any other status', () => {
      const confirmSpy = spyOn(component, 'openConfirmDialog');

      component.selectExperiment(
        createMockExperiment({
          runId: 'r1',
          status: 'Failed' as Experiment['status'],
        })
      );

      expect(router.navigate).not.toHaveBeenCalled();
      expect(toastr.warning).toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe('spinner helpers', () => {
    it('should show the experiment spinner with configured options', () => {
      component.showSpinner();
      expect(spinner.show).toHaveBeenCalledWith(
        'experiment',
        jasmine.objectContaining({ type: 'ball-beat', fullScreen: true })
      );
    });

    it('should hide the experiment spinner', fakeAsync(() => {
      component.hiddenSpinner();
      tick(500); // hiddenSpinner() hides the named spinner after a 500ms delay

      expect(spinner.hide).toHaveBeenCalledWith('experiment');
    }));
  });
});
