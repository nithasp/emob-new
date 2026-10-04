import { TestBed } from '@angular/core/testing';
import { RunOrderDataComponent } from './run-order-data.component';
import { RunOrderDataService } from '../../services/run-order-data.service';
import { configureRunPage } from '../../testing/run-page.testing';

describe('RunOrderDataComponent', () => {
  let component: RunOrderDataComponent;
  let orders: RunOrderDataService;

  beforeEach(async () => {
    await configureRunPage({ declarations: [RunOrderDataComponent] });
    component = TestBed.createComponent(RunOrderDataComponent).componentInstance;
    orders = TestBed.inject(RunOrderDataService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('applyFilter()', () => {
    it('sets the datasource filter from the input value and resets pagination', () => {
      const input = document.createElement('input');
      input.value = '  Hello  ';
      component.applyFilter({ target: input } as unknown as Event);
      expect(orders.dataSource.filter).toBe('hello');
    });
  });
});
