import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { LanguageChangeService } from '@core/services/language-change.service';
import { ResultFilterComponent } from './result-filter.component';
import { ResultPlanService } from '../../services/result-plan.service';
import { ResultMapService } from '../../services/result-map.service';
import { configureResultPage, createRouteInfo } from '../../testing/result-page.testing';

describe('ResultFilterComponent', () => {
  let component: ResultFilterComponent;
  let fixture: ComponentFixture<ResultFilterComponent>;
  let plan: ResultPlanService;
  let resultMap: ResultMapService;

  beforeEach(async () => {
    await configureResultPage({ declarations: [ResultFilterComponent] });
    fixture = TestBed.createComponent(ResultFilterComponent);
    component = fixture.componentInstance;
    plan = TestBed.inject(ResultPlanService);
    resultMap = TestBed.inject(ResultMapService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('evaluateFilter()', () => {
    const cases: Array<[string, number, string, boolean]> = [
      ['equal', 10, '10', true],
      ['equal', 10, '11', false],
      ['does_not_equal', 10, '11', true],
      ['does_not_equal', 10, '10', false],
      ['greater_than', 10, '5', true],
      ['greater_than', 10, '10', false],
      ['greater_than_or_equal', 10, '10', true],
      ['less_than', 5, '10', true],
      ['less_than', 10, '10', false],
      ['less_than_or_equal', 10, '10', true],
    ];

    cases.forEach(([criteria, raw, search, expected]) => {
      it(`"${criteria}" on routeLabel ${raw} vs "${search}" -> ${expected}`, () => {
        expect(
          component.evaluateFilter('routeLabel', raw, search, criteria)
        ).toBe(expected);
      });
    });

    it('converts serviceTime from seconds to minutes before comparing', () => {
      expect(
        component.evaluateFilter('serviceTime', 300, '5', 'equal')
      ).toBeTrue();
    });

    it('converts travelDuration from seconds to minutes (2dp) before comparing', () => {
      expect(
        component.evaluateFilter('travelDuration', 125, '2.08', 'equal')
      ).toBeTrue();
    });

    it('rounds travelDistance and weight before comparing', () => {
      expect(
        component.evaluateFilter('travelDistance', 999.6, '1000', 'equal')
      ).toBeTrue();
      expect(component.evaluateFilter('weight', 49.5, '50', 'equal')).toBeTrue();
    });

    it('passes other columns through unmodified', () => {
      expect(component.evaluateFilter('routeLabel', 7, '7', 'equal')).toBeTrue();
    });

    it('supports string operators: contains/starts_with/ends_with and their negations', () => {
      // numberOfReplaceTypes is treated as a passthrough (string) column
      expect(
        component.evaluateFilter(
          'numberOfReplaceTypes',
          'ABCDEF' as unknown as number,
          'CDE',
          'contains'
        )
      ).toBeTrue();
      expect(
        component.evaluateFilter(
          'numberOfReplaceTypes',
          'ABCDEF' as unknown as number,
          'XYZ',
          'does_not_contain'
        )
      ).toBeTrue();
      expect(
        component.evaluateFilter(
          'numberOfReplaceTypes',
          'ABCDEF' as unknown as number,
          'ABC',
          'starts_with'
        )
      ).toBeTrue();
      expect(
        component.evaluateFilter(
          'numberOfReplaceTypes',
          'ABCDEF' as unknown as number,
          'XYZ',
          'does_not_start_with'
        )
      ).toBeTrue();
      expect(
        component.evaluateFilter(
          'numberOfReplaceTypes',
          'ABCDEF' as unknown as number,
          'DEF',
          'ends_with'
        )
      ).toBeTrue();
      expect(
        component.evaluateFilter(
          'numberOfReplaceTypes',
          'ABCDEF' as unknown as number,
          'XYZ',
          'does_not_end_with'
        )
      ).toBeTrue();
    });

    it('returns false for an unknown criteria', () => {
      expect(
        component.evaluateFilter('routeLabel', 10, '10', 'unknown_op')
      ).toBeFalse();
    });
  });

  describe('multiFilterPredicate()', () => {
    it('returns true when there is no active filter', () => {
      expect(component.multiFilterPredicate(createRouteInfo(), '')).toBeTrue();
    });

    it('matches when any of the OR-ed filters matches (equal on routeLabel)', () => {
      const filter = JSON.stringify([
        { column: 'routeLabel', criteria: 'equal', value: '1' },
      ]);
      expect(
        component.multiFilterPredicate(createRouteInfo({ routeLabel: 1 }), filter)
      ).toBeTrue();
      expect(
        component.multiFilterPredicate(createRouteInfo({ routeLabel: 2 }), filter)
      ).toBeFalse();
    });
  });

  describe('applyFilter() / removeFilter() / setSearchOption() / setSelectedFilterCriteria()', () => {
    beforeEach(() => {
      // resetRouteMapUi()/applyMapFilter() touch the live OL map, which isn't
      // set up in this describe block; that's covered separately below.
      spyOn(resultMap, 'resetRouteMapUi');
      spyOn(resultMap, 'applyMapFilter');
    });

    it('does nothing when the search control is empty', () => {
      component.searchControl.setValue('');
      component.applyFilter();
      expect(component.activeFilters.length).toBe(0);
    });

    it('pushes a new filter, clears the input, and updates the data source filter', () => {
      component.selectedSearchOption = 'routeLabel';
      component.selectedFilterCriteria = 'equal';
      component.searchControl.setValue('1');

      component.applyFilter();

      expect(component.activeFilters).toEqual([
        { column: 'routeLabel', criteria: 'equal', value: '1' },
      ]);
      expect(component.searchControl.value).toBe('');
      expect(plan.dataRouteInfo.filter).toBe(
        JSON.stringify(component.activeFilters)
      );
    });

    it('setSearchOption() updates the selected column', () => {
      component.setSearchOption('weight');
      expect(component.selectedSearchOption).toBe('weight');
    });

    it('setSelectedFilterCriteria() updates the criteria and re-applies the filter', () => {
      component.searchControl.setValue('1');
      component.setSelectedFilterCriteria('contains');
      expect(component.selectedFilterCriteria).toBe('contains');
      expect(component.activeFilters[0].criteria).toBe('contains');
    });

    it('removeFilter() removes only the matching filter entry', fakeAsync(() => {
      component.searchControl.setValue('1');
      component.applyFilter();
      component.searchControl.setValue('2');
      component.applyFilter();
      const [first] = component.activeFilters;

      component.removeFilter(first);
      tick();

      expect(component.activeFilters.length).toBe(1);
      expect(plan.dataRouteInfo.filter).toBe(
        JSON.stringify(component.activeFilters)
      );
    }));

    it('removeFilter() clears the data source filter once no filters remain', fakeAsync(() => {
      component.searchControl.setValue('1');
      component.applyFilter();
      const [first] = component.activeFilters;

      component.removeFilter(first);
      tick();

      expect(component.activeFilters.length).toBe(0);
      expect(plan.dataRouteInfo.filter).toBe('');
    }));

    it('clearFilter() resets the search control and active filters', () => {
      component.searchControl.setValue('1');
      component.applyFilter();

      component.clearFilter();

      expect(component.searchControl.value).toBe('');
      expect(component.activeFilters).toEqual([]);
      expect(plan.dataRouteInfo.filter).toBe('');
    });
  });

  describe('checkOverflow()', () => {
    it('returns early when the chip list is not present in the DOM', () => {
      expect(() => component.checkOverflow()).not.toThrow();
      expect(component.hasOverflow).toBeFalse();
    });
  });

  describe('plan loading', () => {
    it('leaves the table filter and the language listener off until a plan has loaded', () => {
      const tableFilter = plan.dataRouteInfo.filterPredicate;
      component.searchControl.setValue('7');

      TestBed.inject(LanguageChangeService).notifyLangToggle();

      expect(plan.dataRouteInfo.filterPredicate).toBe(tableFilter);
      expect(component.activeFilters).toEqual([]);
    });

    it('takes over the table filter and follows the language once a plan has loaded', fakeAsync(() => {
      const tableFilter = plan.dataRouteInfo.filterPredicate;
      spyOn(component, 'checkOverflow');
      component.searchControl.setValue('7');

      plan.planLoaded$.next();
      TestBed.inject(LanguageChangeService).notifyLangToggle();
      tick();

      expect(plan.dataRouteInfo.filterPredicate).not.toBe(tableFilter);
      expect(component.activeFilters).toEqual([
        { column: 'routeLabel', criteria: 'equal', value: '7' },
      ]);
    }));
  });
});
