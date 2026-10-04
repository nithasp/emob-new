import { TestBed } from '@angular/core/testing';
import { RunVehicleComponent } from './run-vehicle.component';
import { configureRunPage } from '../../testing/run-page.testing';

describe('RunVehicleComponent', () => {
  let component: RunVehicleComponent;

  beforeEach(async () => {
    await configureRunPage({ declarations: [RunVehicleComponent] });
    component = TestBed.createComponent(RunVehicleComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
