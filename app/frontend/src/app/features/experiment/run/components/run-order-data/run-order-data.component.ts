import { Component, ViewChild, OnDestroy } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { LocationType } from '../../../models/location.model';
import { RunUploadFileService } from '../../services/run-upload-file.service';
import { RunOrderDataService } from '../../services/run-order-data.service';
import { RunNavigationService } from '../../services/run-navigation.service';

@Component({
  selector: 'app-run-order-data',
  templateUrl: './run-order-data.component.html',
  styleUrl: './run-order-data.component.scss',
})
export class RunOrderDataComponent implements OnDestroy {
  locationTypeEnum = LocationType;
  displayedColumns: string[] = [
    'No',
    'ORDERID_ORG',
    'ADDRESS',
    'AUMPHER',
    'PROVINCE',
    'TotalOrder',
  ];

  constructor(
    protected readonly files: RunUploadFileService,
    protected readonly orders: RunOrderDataService,
    protected readonly navigation: RunNavigationService,
  ) {}

  // Mat table
  @ViewChild(MatPaginator, { static: false })
  set paginator(value: MatPaginator) {
    if (this.orders.dataSource) {
      this.orders.dataSource.paginator = value;
    }
  }

  @ViewChild(MatSort, { static: false })
  set sort(value: MatSort) {
    if (this.orders.dataSource) {
      this.orders.dataSource.sort = value;
    }
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.orders.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.orders.dataSource.paginator) {
      this.orders.dataSource.paginator.firstPage();
    }
  }

  // The table data lives in the page service and outlives this tab, so it must not keep the destroyed paginator
  ngOnDestroy(): void {
    this.orders.dataSource.paginator = null;
    this.orders.dataSource.sort = null;
  }
}
