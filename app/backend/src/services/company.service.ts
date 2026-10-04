import { Company, Depot } from '../types/company.types';
import { CompanyServiceDeps } from '../types/service.types';
import { AppError } from '../utils/errors';

export function createCompanyService({ companies, depots }: CompanyServiceDeps) {
  return {
    async getCompany(companyId: string): Promise<Company> {
      const company = await companies.show(companyId);
      if (!company) throw new AppError('Company not found', 404, 'not_found');
      return company;
    },

    listDepots(companyId: string): Promise<Depot[]> {
      return depots.listByCompany(companyId);
    },

    async requireDepot(companyId: string, depotId: string): Promise<Depot> {
      const [depot] = await depots.findByIds(companyId, [depotId]);
      if (!depot) throw new AppError('Depot not found', 404, 'not_found');
      return depot;
    },
  };
}

export type CompanyService = ReturnType<typeof createCompanyService>;
