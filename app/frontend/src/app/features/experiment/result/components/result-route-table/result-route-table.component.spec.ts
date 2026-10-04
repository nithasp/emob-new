import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ResultRouteTableComponent } from './result-route-table.component';
import { ResultPlanService } from '../../services/result-plan.service';
import { configureResultPage, createRouteInfo } from '../../testing/result-page.testing';

describe('ResultRouteTableComponent', () => {
  let component: ResultRouteTableComponent;
  let fixture: ComponentFixture<ResultRouteTableComponent>;
  let plan: ResultPlanService;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;

  beforeEach(async () => {
    ({ ngbModalSpy } = await configureResultPage({ declarations: [ResultRouteTableComponent] }));
    fixture = TestBed.createComponent(ResultRouteTableComponent);
    component = fixture.componentInstance;
    plan = TestBed.inject(ResultPlanService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleRow() / isExpanded()', () => {
    it('expands a collapsed row and collapses an expanded one', () => {
      const row = createRouteInfo({ routeIndex: 3 });
      expect(component.isExpanded(row)).toBe('collapsed');

      component.toggleRow(row);
      expect(component.isExpanded(row)).toBe('expanded');

      component.toggleRow(row);
      expect(component.isExpanded(row)).toBe('collapsed');
    });
  });

  describe('handleDistance()', () => {
    it('opens the customer details dialog for a matched routing node', () => {
      (plan as any).routingNodesMap = {
        7: {
          index: 7,
          nodeId: 'N7',
          name: 'Cust 7',
          latitude: 1,
          longitude: 2,
        },
      };
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
      } as unknown as NgbModalRef);

      component.handleDistance(7);

      expect(ngbModalSpy.open).toHaveBeenCalled();
      const modalRef = ngbModalSpy.open.calls.mostRecent().returnValue;
      expect(modalRef.componentInstance.dataCustomer.ORDERID_ORG).toBe('N7');
    });

    it('does nothing for an unmatched or falsy node index', () => {
      (plan as any).routingNodesMap = {};
      component.handleDistance(0);
      component.handleDistance(999);
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('routes built', () => {
    it('hands its sort and paginator to the plan table only once the routes are built', () => {
      const setSort = spyOnProperty(plan.dataRouteInfo, 'sort', 'set');
      const setPaginator = spyOnProperty(plan.dataRouteInfo, 'paginator', 'set');
      expect(setSort).not.toHaveBeenCalled();
      expect(setPaginator).not.toHaveBeenCalled();

      plan.routesBuilt$.next();

      expect(setSort).toHaveBeenCalledOnceWith(component.sort);
      expect(setPaginator).toHaveBeenCalledOnceWith(component.paginator);
    });
  });
});
