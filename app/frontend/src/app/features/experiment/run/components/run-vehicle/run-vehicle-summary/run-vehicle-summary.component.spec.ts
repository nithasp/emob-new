import { TestBed } from '@angular/core/testing';
import { RunVehicleSummaryComponent } from './run-vehicle-summary.component';
import { configureRunPage } from '../../../testing/run-page.testing';

describe('RunVehicleSummaryComponent', () => {
  let component: RunVehicleSummaryComponent;

  beforeEach(async () => {
    await configureRunPage({ declarations: [RunVehicleSummaryComponent] });
    component = TestBed.createComponent(RunVehicleSummaryComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
