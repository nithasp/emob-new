import { TestBed } from '@angular/core/testing';
import { RunParameterComponent } from './run-parameter.component';
import { configureRunPage, createDynamicParameter } from '../../testing/run-page.testing';

describe('RunParameterComponent', () => {
  let component: RunParameterComponent;

  beforeEach(async () => {
    await configureRunPage({ declarations: [RunParameterComponent] });
    component = TestBed.createComponent(RunParameterComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('trackByGroup() / trackByParam()', () => {
    it('trackByGroup returns the group key', () => {
      expect(component.trackByGroup(0, { key: 'General', items: [] })).toBe(
        'General'
      );
    });

    it('trackByParam returns the id, or a composite fallback', () => {
      expect(
        component.trackByParam(0, createDynamicParameter({ id: 'p1' }))
      ).toBe('p1');
      expect(
        component.trackByParam(
          2,
          createDynamicParameter({ id: '', depotId: 'd1', keyName: 'k' })
        )
      ).toBe('d1-k-2');
    });
  });
});
