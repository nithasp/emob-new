import { TestBed } from '@angular/core/testing';
import { RunMapComponent } from './run-map.component';
import { configureRunPage } from '../../testing/run-page.testing';

describe('RunMapComponent', () => {
  let component: RunMapComponent;

  beforeEach(async () => {
    await configureRunPage({ declarations: [RunMapComponent] });
    component = TestBed.createComponent(RunMapComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
