import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import OlMap from 'ol/Map';
import { ConfigurationService } from '@features/configurations/services/configuration.service';
import { ExperimentService } from '../services/experiment.service';
import { DownloadResultFile, Experiment } from '../models/experiment.model';
import { ResultComponent } from './result.component';
import { ResultPlanService } from './services/result-plan.service';
import { ResultMapService } from './services/result-map.service';
import { ExperimentFileService } from '../services/experiment-file.service';
import {
  configureResultPage,
  createExperiment,
  mockVrpStats,
  mockVrpSolution,
  mockGeoJson,
} from './testing/result-page.testing';

describe('ResultComponent', () => {
  let component: ResultComponent;
  let fixture: ComponentFixture<ResultComponent>;
  let plan: ResultPlanService;
  let resultMap: ResultMapService;
  let experimentFiles: ExperimentFileService;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let configurationServiceSpy: jasmine.SpyObj<ConfigurationService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let paramsSubject: Subject<{ [key: string]: string }>;

  beforeEach(async () => {
    ({
      spinnerSpy,
      ngbModalSpy,
      experimentServiceSpy,
      configurationServiceSpy,
      toastrSpy,
      routerSpy,
      paramsSubject,
    } = await configureResultPage({ declarations: [ResultComponent] }));
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    plan = fixture.debugElement.injector.get(ResultPlanService);
    resultMap = fixture.debugElement.injector.get(ResultMapService);
    experimentFiles = TestBed.inject(ExperimentFileService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(spinnerSpy.show).toHaveBeenCalled();
  });

  describe('full plan-loading pipeline (ngOnInit)', () => {
    beforeEach(() => {
      experimentServiceSpy.getExperiment.and.returnValue(
        of(createExperiment())
      );
      spyOn(experimentFiles, 'dataFromFileUrlToJson').and.callFake((url: string) => {
        if (url.includes('vrp-stats')) return Promise.resolve(mockVrpStats);
        if (url.includes('vrp-solution'))
          return Promise.resolve(mockVrpSolution);
        if (url.includes('geojson')) return Promise.resolve(mockGeoJson);
        return Promise.resolve({});
      });
    });

    it('loads plan data, builds the report/dashboard, routes, and the map', fakeAsync(() => {
      paramsSubject.next({ experimentId: 'run-1' });
      tick();

      expect(experimentServiceSpy.getExperiment).toHaveBeenCalledWith('run-1');
      expect(plan.isLoading).toBeFalse();
      expect(spinnerSpy.hide).toHaveBeenCalled();

      expect(plan.headersReport).toEqual(['property', 'value']);
      const customerCountRow = plan.dataSourceReport.find(
        (r) => r.property === 'customerCount'
      );
      expect(customerCountRow?.value).toBe(1);
      const feasibleRow = plan.dataSourceReport.find(
        (r) => r.property === 'isSolutionFeasible'
      );
      expect(feasibleRow?.value).toBe('Yes');
      const weightUnitRow = plan.dataSourceReport.find(
        (r) => r.property === 'weightUnit'
      );
      expect(weightUnitRow?.value).toBe('kg');
      const unassignedRow = plan.dataSourceReport.find(
        (r) => r.property === 'unassignedCustomers'
      );
      expect(unassignedRow?.value).toBe(0);

      expect(
        plan.vrpDashboardCards.find((c) => c.label === 'customerCount')
          ?.value
      ).toBe(1);
      expect(
        plan.vrpDashboardRows.find((r) => r.metric === 'totalWeight')
          ?.totalValue
      ).toBe(50);

      expect(plan.dataRouteInfo.data.length).toBe(1);
      const route = plan.dataRouteInfo.data[0];
      expect(route.routeLabel).toBe(1);
      expect(route.numberDeliveryPoints).toBe(1);
      expect(route.weight).toBe(50);
      expect(route.travelDistance).toBe(1000);
      expect(route.zone).toEqual(['Z1']);
      expect(route.routeDistances).toEqual([500, 500]);

      expect(resultMap.map).toBeInstanceOf(OlMap);
      expect(resultMap.mapAlreadyRendered).toBeTrue();
    }));

    it('shows an error toast and stops loading when plan data fails to fetch', fakeAsync(() => {
      (experimentFiles.dataFromFileUrlToJson as jasmine.Spy).and.callFake(
        (url: string) => {
          if (url.includes('vrp-stats'))
            return Promise.reject(new Error('network error'));
          return Promise.resolve({});
        }
      );

      paramsSubject.next({ experimentId: 'run-1' });
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(plan.isLoading).toBeFalse();
      expect(spinnerSpy.hide).toHaveBeenCalled();
      expect(plan.dataRouteInfo.data.length).toBe(0);
    }));
  });

  describe('tryToRerunExperiment()', () => {
    beforeEach(() => {
      plan.experiment = createExperiment();
    });

    it('replicates the experiment and navigates on confirmation + success', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      experimentServiceSpy.replicateExperiment.and.returnValue(
        of({ runId: 'new-run' } as Experiment)
      );

      component.tryToRerunExperiment();
      tick();

      expect(experimentServiceSpy.replicateExperiment).toHaveBeenCalledWith(
        'run-1'
      );
      expect(routerSpy.navigate).toHaveBeenCalledWith([
        '/users/run',
        'new-run',
      ]);
      expect(toastrSpy.success).toHaveBeenCalled();
    }));

    it('does not replicate when the dialog is not confirmed', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(false),
      } as unknown as NgbModalRef);

      component.tryToRerunExperiment();
      tick();

      expect(experimentServiceSpy.replicateExperiment).not.toHaveBeenCalled();
    }));

    it('shows an error toast when replication fails', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      experimentServiceSpy.replicateExperiment.and.returnValue(
        throwError(() => new Error('replicate failed'))
      );

      component.tryToRerunExperiment();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
    }));
  });

  describe('downloadPlan()', () => {
    beforeEach(() => {
      plan.experiment = createExperiment();
    });

    it('downloads the file and shows a success toast', fakeAsync(() => {
      const downloadResult: DownloadResultFile = {
        resultFileBlobPath: 'path',
        fileUrl: { resultFileBlobPathUrl: 'https://example.com/plan.csv' },
      };
      experimentServiceSpy.getExperimentResultUrl.and.returnValue(
        of(downloadResult)
      );
      configurationServiceSpy.downloadFile.and.returnValue(
        of(
          new HttpResponse({
            body: new Blob(['data']),
            headers: new HttpHeaders({
              'Content-Disposition': 'attachment; filename="plan.csv"',
            }),
          })
        )
      );

      component.downloadPlan();
      tick();

      expect(toastrSpy.success).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('shows an error toast when the result URL lookup fails', fakeAsync(() => {
      experimentServiceSpy.getExperimentResultUrl.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.downloadPlan();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('shows an error toast when the file download fails', fakeAsync(() => {
      const downloadResult: DownloadResultFile = {
        resultFileBlobPath: 'path',
        fileUrl: { resultFileBlobPathUrl: 'https://example.com/plan.csv' },
      };
      experimentServiceSpy.getExperimentResultUrl.and.returnValue(
        of(downloadResult)
      );
      configurationServiceSpy.downloadFile.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.downloadPlan();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));
  });

  describe('routesBuilt$ / planLoaded$', () => {
    let built: jasmine.Spy;
    let loaded: jasmine.Spy;

    beforeEach(() => {
      experimentServiceSpy.getExperiment.and.returnValue(
        of(createExperiment())
      );
      built = jasmine.createSpy('routesBuilt');
      loaded = jasmine.createSpy('planLoaded');
      plan.routesBuilt$.subscribe(built);
      plan.planLoaded$.subscribe(loaded);
    });

    it('announces the built routes, then the loaded plan', fakeAsync(() => {
      spyOn(experimentFiles, 'dataFromFileUrlToJson').and.callFake((url: string) => {
        if (url.includes('vrp-stats')) return Promise.resolve(mockVrpStats);
        if (url.includes('vrp-solution'))
          return Promise.resolve(mockVrpSolution);
        if (url.includes('geojson')) return Promise.resolve(mockGeoJson);
        return Promise.resolve({});
      });

      paramsSubject.next({ experimentId: 'run-1' });
      tick();

      expect(built).toHaveBeenCalledTimes(1);
      expect(loaded).toHaveBeenCalledTimes(1);
      expect(built).toHaveBeenCalledBefore(loaded);
    }));

    it('stays silent when the plan fails to load', fakeAsync(() => {
      spyOn(experimentFiles, 'dataFromFileUrlToJson').and.rejectWith(
        new Error('network error')
      );

      paramsSubject.next({ experimentId: 'run-1' });
      tick();

      expect(built).not.toHaveBeenCalled();
      expect(loaded).not.toHaveBeenCalled();
    }));
  });
});
