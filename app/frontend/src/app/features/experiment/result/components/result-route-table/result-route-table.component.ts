import { Component, OnInit, ViewChild } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RouteInfo, RoutingNodeProductQuantity } from '../../../models/location.model';
import { CustomerDetailsComponent } from '../../../components/customer-details/customer-details.component';
import { ResultPlanService } from '../../services/result-plan.service';
import { ResultMapService } from '../../services/result-map.service';
import { isNumber } from '../../utils/number-value.utils';
import { ROUTE_COLUMNS } from '../../utils/route-columns.utils';

@Component({
  selector: 'app-result-route-table',
  templateUrl: './result-route-table.component.html',
  styleUrl: './result-route-table.component.scss',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class ResultRouteTableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  columnsToDisplay: string[] = ROUTE_COLUMNS;

  columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
  expandedElement: RouteInfo[] = [];

  protected readonly isNumber = isNumber;

  constructor(
    private readonly ngbModal: NgbModal,
    protected readonly plan: ResultPlanService,
    protected readonly resultMap: ResultMapService,
  ) {}

  ngOnInit(): void {
    // The routes are pushed into the table's own array, which draws nothing by itself: handing
    // over the sort and the paginator at this point is what makes the table show them
    this.plan.routesBuilt$.subscribe(() => {
      this.plan.dataRouteInfo.sort = this.sort;
      this.plan.dataRouteInfo.paginator = this.paginator;
    });
  }

  toggleRow(row: RouteInfo) {
    const index = this.expandedElement.findIndex(
      (x) => x.routeIndex == row.routeIndex
    );
    if (index === -1) {
      this.expandedElement.push(row);
    } else {
      this.expandedElement.splice(index, 1);
    }
  }

  isExpanded(row: RouteInfo): string {
    const index = this.expandedElement.findIndex(
      (x) => x.routeIndex == row.routeIndex
    );
    if (index === -1) {
      return 'collapsed';
    }
    return 'expanded';
  }

  handleDistance(nodeIndex: number) {
    if (!nodeIndex) return;

    const matchedItem = this.plan.routingNodesMap[nodeIndex];
    if (!matchedItem) return;

    const planDetails = {
      ORDERID_ORG: matchedItem?.nodeId ?? '',
      CHANNEL: matchedItem?.additionalProperties?.channel ?? '',
      CUSTOMER_NAME: matchedItem?.name ?? '',
      TEL: matchedItem?.additionalProperties?.telephone?.toString() ?? '',
      AUMPHER: matchedItem?.originalAddress?.district ?? '',
      PROVINCE: matchedItem?.originalAddress?.province ?? '',
      ZIPCODE: matchedItem?.originalAddress?.postalCode ?? '',
      ADDRESS: matchedItem?.originalAddress?.address ?? '',
      latitude: matchedItem?.latitude ?? 0,
      longitude: matchedItem?.longitude ?? 0,
      details:
        matchedItem?.productQuantity?.map(
          (product: RoutingNodeProductQuantity) => ({
            PRODUCTID: product?.productId ?? '',
            ORDER_ID: product?.skuCode ?? '',
            PRODUCTNAME: product?.name ?? '',
            QUANTITYMAIN: product?.productQuantity ?? 0,
          })
        ) ?? [],
    };

    const modalRef = this.ngbModal.open(CustomerDetailsComponent, {
      centered: true,
      size: 'xl',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      beforeDismiss: () => false,
    });

    modalRef.componentInstance.dataPreOrder = planDetails;
    modalRef.componentInstance.dataCustomer = planDetails;
    modalRef.componentInstance.isGeolocationDisplay = false;
  }
}
