import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { UserService } from '@core/services/auth/user.service';
import { DataService } from '@shared/services/data.service';
import { ExportFileService } from '@shared/services/export-file.service';
import { ConfigurationService } from '@features/configurations/services/configuration.service';
import { VehicleService } from '@features/configurations/services/vehicle.service';
import { ConstraintService } from '../services/constraint.service';
import { ExperimentService } from '../services/experiment.service';
import { PreOrderService } from '../services/pre-order.service';

export interface RunPageSpies {
  spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  constraintServiceSpy: jasmine.SpyObj<ConstraintService>;
  experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  ngbModalSpy: jasmine.SpyObj<NgbModal>;
  toastrSpy: jasmine.SpyObj<ToastrService>;
  preOrderServiceSpy: jasmine.SpyObj<PreOrderService>;
  routerSpy: jasmine.SpyObj<Router>;
  userServiceSpy: jasmine.SpyObj<UserService>;
  configurationServiceSpy: jasmine.SpyObj<ConfigurationService>;
  dataServiceSpy: jasmine.SpyObj<DataService>;
  exportServiceSpy: jasmine.SpyObj<ExportFileService>;
  vehicleServiceSpy: jasmine.SpyObj<VehicleService>;
  paramsSubject: Subject<{ [key: string]: string }>;
}

export interface ResultPageSpies {
  spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  ngbModalSpy: jasmine.SpyObj<NgbModal>;
  experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  configurationServiceSpy: jasmine.SpyObj<ConfigurationService>;
  toastrSpy: jasmine.SpyObj<ToastrService>;
  routerSpy: jasmine.SpyObj<Router>;
  translocoSpy: jasmine.SpyObj<TranslocoService>;
  httpSpy: jasmine.SpyObj<HttpClient>;
  paramsSubject: Subject<{ [key: string]: string }>;
}

/**
 * The result component consumes these plan payloads through `any`-typed fields
 * (`vrpSolutionData`, `geoJsonRawData`, `routingNodesMap`), so its spec
 * describes them with the shapes below rather than the shared models.
 */
export interface SpecRoutingNode {
  index: number;
  nodeId: string;
  isDepot: boolean;
  name: string;
  latitude: number;
  longitude: number;
  zone?: string;
  deliveryWeight?: number;
  originalAddress?: {
    address: string;
    district: string;
    province: string;
    postalCode: string;
  };
  additionalProperties?: { channel?: string; telephone?: string };
}

export interface SpecRouteMetric {
  routeIndex: number;
  routeLabel: number;
  routeNodes: number[];
  customerCount: number;
  routeWeight: number;
  routeDistance: number;
  routeDuration: number;
  routeTravelDuration: number;
  routeServiceDuration: number;
}

export interface SpecVrpSolutionData {
  vrpData: { routingNodes: SpecRoutingNode[] };
  solutionMetrics: { routeMetrics: SpecRouteMetric[] };
}

export interface SpecGeoJsonFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: number[] | number[][] };
}

export interface SpecVrpGeoJsonData {
  routes: Array<{ type: string; features: SpecGeoJsonFeature[] }>;
  depots: SpecGeoJsonFeature[];
}
