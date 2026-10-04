import { TestBed } from '@angular/core/testing';
import { RunVehicleListComponent } from './run-vehicle-list.component';
import { configureRunPage } from '../../../testing/run-page.testing';

describe('RunVehicleListComponent', () => {
  let component: RunVehicleListComponent;

  beforeEach(async () => {
    await configureRunPage({ declarations: [RunVehicleListComponent] });
    component = TestBed.createComponent(RunVehicleListComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
