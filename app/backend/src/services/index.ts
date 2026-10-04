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
import { createAuditService } from './audit.service';
import { createCompanyService } from './company.service';
import { createConfigurationService } from './configuration.service';
import { ExperimentService, createExperimentService } from './experiment.service';
import { createExperimentRunner } from './experimentRunner';
import { createParameterService } from './parameter.service';
import { createStorageDriver, createStorageService } from './storage/storage.service';
import { createTokenService } from './token.service';
import { createUserService } from './user.service';
import { createVehicleService } from './vehicle.service';

export const repositories = {
  auditLogs: new AuditLogRepository(),
  companies: new CompanyRepository(),
  configurations: new ConfigurationRepository(),
  depots: new DepotRepository(),
  experiments: new ExperimentRepository(),
  parameters: new DynamicParameterRepository(),
  refreshTokens: new RefreshTokenRepository(),
  users: new UserRepository(),
  vehicles: new VehicleRepository(),
  vehicleTypes: new VehicleTypeRepository(),
};

const {
  auditLogs,
  companies,
  configurations,
  depots,
  experiments,
  parameters,
  refreshTokens,
  users,
  vehicles,
  vehicleTypes,
} = repositories;

export const storageService = createStorageService(createStorageDriver());
export const auditService = createAuditService({ auditLogs });
export const tokenService = createTokenService({ refreshTokens, users, audit: auditService });
export const userService = createUserService({ users, companies });
export const companyService = createCompanyService({ companies, depots });
export const vehicleService = createVehicleService({ vehicles, vehicleTypes, depots });
export const parameterService = createParameterService({ parameters });
export const configurationService = createConfigurationService({
  configurations,
  depots,
  storage: storageService,
});

// The runner and the experiment service need each other: the runner calls back into the service
// to plan a run, so it is handed a function that resolves the service when a job fires
export const experimentRunner = createExperimentRunner({
  experiments,
  solve: (runId) => experimentService.solve(runId),
});

export const experimentService: ExperimentService = createExperimentService({
  experiments,
  depots,
  vehicleTypes,
  vehicles,
  parameters,
  configurations: configurationService,
  storage: storageService,
  runner: experimentRunner,
});
