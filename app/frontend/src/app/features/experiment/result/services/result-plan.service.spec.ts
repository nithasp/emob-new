import { TestBed } from '@angular/core/testing';
import { ResultPlanService } from './result-plan.service';
import { configureResultPage } from '../testing/result-page.testing';

describe('ResultPlanService', () => {
  let plan: ResultPlanService;

  beforeEach(async () => {
    await configureResultPage();
    plan = TestBed.inject(ResultPlanService);
  });

  it('should create', () => {
    expect(plan).toBeTruthy();
  });
});
