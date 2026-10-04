import { TestBed } from '@angular/core/testing';
import { Run } from '../../models/experiment.model';
import { RunStateService } from './run-state.service';
import { configureRunPage, createExperiment, createMyDepot } from '../testing/run-page.testing';

describe('RunStateService', () => {
  let state: RunStateService;

  beforeEach(async () => {
    await configureRunPage();
    state = TestBed.inject(RunStateService);
  });

  it('should create', () => {
    expect(state).toBeTruthy();
  });

  describe('generateUniqueId()', () => {
    it('returns a unique, prefixed id on each call', () => {
      const a = state.generateUniqueId();
      const b = state.generateUniqueId();
      expect(a).not.toBe(b);
      expect(a.startsWith('f-')).toBeTrue();
    });
  });

  describe('isOriginalExperiment()', () => {
    it('reflects experiment.run', () => {
      state.experiment = createExperiment({ run: Run.Original });
      expect(state.isOriginalExperiment()).toBeTrue();
      state.experiment = createExperiment({ run: Run.Rerun });
      expect(state.isOriginalExperiment()).toBeFalse();
    });
  });

  describe('getSelectedDepotObject()', () => {
    it('finds the depot matching selectedDepotIdName', () => {
      const depot = createMyDepot({ depotName: 'Depot X' });
      state.depots = [depot];
      state.selectedDepotIdName = 'Depot X';
      expect(state.getSelectedDepotObject()).toBe(depot);

      state.selectedDepotIdName = null;
      expect(state.getSelectedDepotObject()).toBeUndefined();
    });
  });
});
