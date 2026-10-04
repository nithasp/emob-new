import { TestBed } from '@angular/core/testing';
import { RunVehiclePoolComponent } from './run-vehicle-pool.component';
import { configureRunPage } from '../../../testing/run-page.testing';

describe('RunVehiclePoolComponent', () => {
  let component: RunVehiclePoolComponent;

  beforeEach(async () => {
    await configureRunPage({ declarations: [RunVehiclePoolComponent] });
    component = TestBed.createComponent(RunVehiclePoolComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
