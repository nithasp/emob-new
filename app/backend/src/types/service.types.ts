import { AuditLogRepository } from '../repositories/auditLog.repository';
import { CompanyRepository } from '../repositories/company.repository';
import { ConfigurationRepository } from '../repositories/configuration.repository';
import { DepotRepository } from '../repositories/depot.repository';
import { DynamicParameterRepository } from '../repositories/dynamicParameter.repository';
import { ExperimentRepository } from '../repositories/experiment.repository';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { UserRepository } from '../repositories/user.repository';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { VehicleTypeRepository } from '../repositories/vehicleType.repository';
import type { ConfigurationService } from '../services/configuration.service';
import type { StorageService } from '../services/storage/storage.service';
import { NewAuditLog } from './auditLog.types';
import { SolveOutcome } from './experiment.types';

export interface EventRecorder {
  recordEvent(entry: NewAuditLog): void;
}

export interface JobRunner {
  enqueue(runId: string): void;
  cancel(runId: string): void;
}

export interface AuditServiceDeps {
  auditLogs: Pick<AuditLogRepository, 'create' | 'deleteOlderThan'>;
}

export interface TokenServiceDeps {
  refreshTokens: Pick<
    RefreshTokenRepository,
    | 'create'
    | 'consume'
    | 'findUsed'
    | 'deleteFamily'
    | 'deleteFamilyOf'
    | 'deleteAllForUser'
    | 'deleteExpired'
  >;
  users: Pick<UserRepository, 'show'>;
  audit: EventRecorder;
}

export interface UserServiceDeps {
  users: Pick<
    UserRepository,
    'show' | 'findByUsername' | 'findCredentials' | 'create' | 'updatePassword' | 'updateProfile'
  >;
  companies: Pick<CompanyRepository, 'findByName' | 'upsert'>;
}

export interface CompanyServiceDeps {
  companies: Pick<CompanyRepository, 'show'>;
  depots: Pick<DepotRepository, 'listByCompany' | 'findByIds'>;
}

export interface VehicleServiceDeps {
  vehicles: Pick<
    VehicleRepository,
    'listByCompany' | 'show' | 'existingPlates' | 'create' | 'update' | 'delete'
  >;
  vehicleTypes: Pick<VehicleTypeRepository, 'listByCompany' | 'show' | 'create' | 'update' | 'delete'>;
  depots: Pick<DepotRepository, 'listByCompany' | 'findByIds'>;
}

export interface ParameterServiceDeps {
  parameters: Pick<DynamicParameterRepository, 'listForDepot' | 'show' | 'updateValue' | 'delete'>;
}

export interface ConfigurationServiceDeps {
  configurations: Pick<
    ConfigurationRepository,
    'listByCompany' | 'show' | 'findByDepotAndName' | 'listByCategory' | 'create' | 'replaceFile'
  >;
  depots: Pick<DepotRepository, 'listByCompany'>;
  storage: Pick<StorageService, 'put' | 'get' | 'delete' | 'fileUrl'>;
}

export interface ExperimentServiceDeps {
  experiments: Pick<
    ExperimentRepository,
    'listByCompany' | 'show' | 'showById' | 'create' | 'update' | 'transition' | 'setDepots'
  >;
  depots: Pick<DepotRepository, 'listByCompany'>;
  vehicleTypes: Pick<VehicleTypeRepository, 'findByIds'>;
  vehicles: Pick<VehicleRepository, 'findByIds'>;
  parameters: Pick<DynamicParameterRepository, 'listForDepot'>;
  configurations: Pick<ConfigurationService, 'listForDepots' | 'productMaster'>;
  storage: Pick<StorageService, 'put' | 'putJson' | 'get' | 'getJson' | 'delete' | 'copy' | 'fileUrl'>;
  runner: JobRunner;
}

export interface ExperimentRunnerDeps {
  experiments: Pick<ExperimentRepository, 'showById' | 'listPending' | 'transition'>;
  solve: (runId: string) => Promise<SolveOutcome>;
}
