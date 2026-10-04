import { Injectable, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataService } from '@shared/services/data.service';
import { LoggerService } from '@core/services/logger.service';
import {
  Customer,
  CustomerProduct,
  CustomerUpdated,
  DataPreOrder,
  Depot,
  GroupedDataPreOrder,
  ReplaceType,
  ValidationType,
} from '../../models/pre-order.model';
import { MyDepot, DepotInputRequirement } from '../../models/experiment.model';
import {
  DataGroup,
  DisplayLocationType,
  LocationType,
  Location,
} from '../../models/location.model';
import { CustomerDetailsComponent } from '../../components/customer-details/customer-details.component';
import { CustomerListComponent } from '../../components/customer-list/customer-list.component';
import { RunStateService } from './run-state.service';
import { RunMapService } from './run-map.service';
import { RunUploadFileService } from './run-upload-file.service';

@Injectable()
export class RunOrderDataService {
  private readonly logger = inject(LoggerService);

  public groupedDataPreOrder: Partial<GroupedDataPreOrder> = {};
  public preOrderCount: number = 0;
  public uploadDataGroupCustomers?: DataGroup | null;
  public customersLocationUpdated: Array<CustomerUpdated> = [];
  public countUploadedCustomers: number = 0;
  //display table and virtualization

  displayLocationType: DisplayLocationType = {
    verify: false,
    uncertain: true,
    unverify: true,
    edit: true,
  };
  dataSource = new MatTableDataSource<Customer>();

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly dataService: DataService,
    private readonly state: RunStateService,
    private readonly runMap: RunMapService,
    private readonly files: RunUploadFileService,
  ) {}

  groupingCustomer(customers: Customer[], depots: Depot[]) {
    this.countUploadedCustomers = customers.length;
    this.preOrderCount = customers.reduce((sum, customer) => {
      const products =
        (customer.productQuantity?.length ? customer.productQuantity : null) ||
        customer.extra?.productsInfo ||
        [];
      return sum + products.length;
    }, 0);

    const groupedCustomer = this.groupCustomers(customers);

    this.logger.log('groupingCustomer customers', customers);
    this.logger.log('groupingCustomer depots', depots);

    this.uploadDataGroupCustomers = {
      verify: {
        customers: groupedCustomer.verify,
        type: LocationType.Verify,
      },
      uncertain: {
        customers: groupedCustomer.uncertain,
        type: LocationType.Uncertain,
      },
      unverify: {
        customers: groupedCustomer.unverify,
        type: LocationType.Unverify,
      },
      edit: {
        customers: [],
        type: LocationType.Edit,
      },
    };

    this.logger.log('this.uploadDataGroupCustomers', this.uploadDataGroupCustomers);
    this.logger.log('depots', depots);

    this.reInitializeDataTable();
    this.runMap.loadLocation(this.uploadDataGroupCustomers, this.displayLocationType);
    this.loadLocationDepot(depots);
    this.state.isUpload = true;
    this.state.isFileSelectionStep = false;
  }

  private groupCustomers(customers: Array<Customer>) {
    const verify: Customer[] = [];
    const uncertain: Customer[] = [];
    const unverify: Customer[] = [];

    customers.forEach((customer) => {
      if (
        ((customer.replaceType === ReplaceType.NO_REPLACE ||
          customer.replaceType === ReplaceType.INPUT) &&
          (customer.validationType === ValidationType.SUBDISTRICT_LEVEL ||
            customer.validationType === ValidationType.DISTRICT_LEVEL)) ||
        customer.replaceType === ReplaceType.GEOCODE
      ) {
        verify.push(customer);
      } else if (
        customer.replaceType === ReplaceType.SUBDISTRICT_LEVEL ||
        customer.replaceType === ReplaceType.DISTRICT_LEVEL
      ) {
        uncertain.push(customer);
      } else if (
        customer.replaceType === ReplaceType.PROVINCE_LEVEL ||
        customer.validationType === ValidationType.NO_VALID ||
        customer.validationType === ValidationType.NAN_INPUT ||
        customer.validationType === ValidationType.NON_VALIDATED
      ) {
        unverify.push(customer);
      }
    });

    return { verify, uncertain, unverify };
  }

  private loadLocationDepot(
    incoming: Array<{
      depotId?: string;
      id?: string;
      depotName?: string;
      name?: string;
      latitude?: number | string;
      longitude?: number | string;
      columns?: string[];
      inputdata?: DepotInputRequirement[];
      timeWindowEarly?: string | number;
      timeWindowLate?: string | number;
      createdAt?: string;
      updatedAt?: string;
    }>,
  ) {
    this.logger.log('loadLocationDepot incoming', incoming);

    // Always use the incoming depots array for default selection and display
    const normalizedIncoming: MyDepot[] = incoming.map((item) => {
      const nameKey =
        typeof item.depotName === 'string'
          ? item.depotName
          : typeof item.name === 'string'
            ? item.name
            : '';
      const mapped: MyDepot = {
        depotId: (item.depotId || item.id || '') as string,
        depotName: nameKey,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        columns: item.columns || [],
        inputdata: item.inputdata || [],
        timeWindowEarly: String(item.timeWindowEarly ?? ''),
        timeWindowLate: String(item.timeWindowLate ?? ''),
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      };
      return mapped;
    });

    this.state.depots = normalizedIncoming;

    this.logger.log('this.state.depots', this.state.depots);

    if (!this.state.experiment.depots || this.state.experiment.depots.length === 0) {
      this.state.experiment.depots = normalizedIncoming.map((depot: MyDepot) => ({
        companyName: this.state.experiment.companyName,
        depotId: depot.depotId || '',
        depotName: depot.depotName,
        latitude: Number(depot.latitude),
        longitude: Number(depot.longitude),
        timeWindowEarly: depot.timeWindowEarly || '',
        timeWindowLate: depot.timeWindowLate || '',
        createdAt: depot.createdAt || '',
        updatedAt: depot.updatedAt || '',
        columns: depot.columns || [],
      }));
    }

    // Set default selection to the first depot in the incoming list
    if (this.state.depots && this.state.depots.length > 0) {
      const defaultDepotName =
        (this.state.experiment && this.state.experiment.depots && this.state.experiment.depots[0]
          ? this.state.experiment.depots[0].depotName
          : this.state.depots[0].depotName) || this.state.depots[0].depotName;
      this.state.selectedDepotIdName = defaultDepotName;
      const selectedDepot =
        this.state.depots.find((d) => d.depotName === this.state.selectedDepotIdName) ||
        this.state.depots[0];
      this.files.updateInputDataKeysFromDepot(selectedDepot);
      this.files.updateRequiredFileTypeByDepot(selectedDepot);
    } else {
      this.state.selectedDepotIdName = null;
      this.files.inputDataKeys = [];
      this.files.depotInputDataItems = [];
      this.files.updateRequiredFileTypeByDepot(undefined);
    }

    this.runMap.plotDepots(this.state.depots);
  }

  private reInitializeDataTable(): void {
    if (!this.uploadDataGroupCustomers) {
      this.dataSource.data = [];
      return;
    }

    const keys = Object.keys(this.uploadDataGroupCustomers).sort();

    const newData: Customer[] = [];

    for (const key of keys) {
      if (this.displayLocationType[key as keyof DisplayLocationType]) {
        newData.push(
          ...this.uploadDataGroupCustomers[key as keyof DataGroup].customers,
        );
      }
    }

    this.dataSource.data = newData;
    // this.dataSource.data = newData;
  }

  displayDataInTable(locationType: LocationType) {
    this.displayLocationType[locationType] =
      !this.displayLocationType[locationType];

    this.reInitializeDataTable();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    this.runMap.loadLocation(
      this.uploadDataGroupCustomers!,
      this.displayLocationType,
    );
  }

  openCustomerOrderDetails(customer: Customer) {
    this.logger.log('openCustomerOrderDetails customer', customer);

    const modalRef = this.ngbModal.open(CustomerDetailsComponent, {
      centered: true,
      size: 'xl',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      beforeDismiss: () => {
        return false;
      },
    });

    const existingIndex = this.customersLocationUpdated.findIndex(
      (item) => item.index === customer.index && item.name === customer.name,
    );

    if (existingIndex !== -1) {
      modalRef.componentInstance.locationType = LocationType.Edit;
    }

    const products =
      (customer.productQuantity?.length ? customer.productQuantity : null) ||
      customer.extra?.productsInfo ||
      [];

    const dataPreOrder: DataPreOrder = {
      ORDERID_ORG: customer.nodeId,
      CHANNEL: customer.additionalProperties?.channel || null,
      CUSTOMER_NAME: customer.name || '',
      TEL: customer.additionalProperties?.telephone || null,
      ADDRESS: customer.originalAddress?.address || '',
      AUMPHER: customer.originalAddress?.district || null,
      PROVINCE: customer.originalAddress?.province || null,
      ZIPCODE: customer.originalAddress?.postalCode || null,
      details: (products as CustomerProduct[]).map((product) => ({
        PRODUCTID: product.productId ?? '',
        ORDER_ID: product.skuCode ?? product.orderId ?? null,
        PRODUCTNAME: product.name ?? product.productName ?? '',
        QUANTITYMAIN: product.productQuantity ?? product.quantityMajor ?? 0,
        QUANTITYMINOR: product.quantityMinor ?? 0,
        UserConfirm: product.userConfirm ?? null,
        DateConfirm: product.dateConfirm ?? null,
      })),
    };

    // Pass customer directly as dataCustomer (the component expects Customer type)
    modalRef.componentInstance.dataPreOrder = dataPreOrder;
    modalRef.componentInstance.dataCustomer = customer;

    modalRef.result.then((locationUpdated: Location) => {
      if (
        Number(customer.longitude) !== Number(locationUpdated.longitude) ||
        Number(customer.latitude) !== Number(locationUpdated.latitude)
      ) {
        const updatedCustomer = {
          nodeId: customer.nodeId,
          index: customer.index,
          name: customer.name,
          latitude: locationUpdated.latitude,
          longitude: locationUpdated.longitude,
        };

        if (existingIndex !== -1) {
          this.customersLocationUpdated[existingIndex] = updatedCustomer;
        } else {
          this.customersLocationUpdated.push(updatedCustomer);
        }

        this.moveCustomerToEdit(customer, locationUpdated);
        this.state.haveUpdateAfterValidated = true;
        this.dataService.saveData(
          this.state.experiment.runId,
          this.customersLocationUpdated,
        );
      }
    });
  }

  openCustomersListToVerify() {
    const modalRef = this.ngbModal.open(CustomerListComponent, {
      centered: true,
      size: 'xl',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      windowClass: 'custom-modal-width',
      modalDialogClass: 'custom-modal-content',
      beforeDismiss: () => {
        return false;
      },
    });
    modalRef.componentInstance.groupedDataPreOrder = this.groupedDataPreOrder;
    modalRef.componentInstance.uploadDataGroupCustomers =
      this.uploadDataGroupCustomers;

    modalRef.result.then((locationUpdated: Array<CustomerUpdated>) => {
      this.updateCustomerGroup(locationUpdated);
      if (locationUpdated.length > 0) this.state.haveUpdateAfterValidated = true;

      this.dataService.saveData(
        this.state.experiment.runId,
        this.customersLocationUpdated,
      );
    });
  }

  moveCustomerToEdit(customer: Customer, locationUpdated: Location) {
    // Find and remove the customer from uncertain
    const uncertainIndex =
      this.uploadDataGroupCustomers!.uncertain.customers.findIndex(
        (c) => c.name === customer.name,
      );
    // Find and remove the customer from unverify
    const unverifyIndex =
      this.uploadDataGroupCustomers!.unverify.customers.findIndex(
        (c) => c.name === customer.name,
      );
    if (uncertainIndex !== -1) {
      const _customer =
        this.uploadDataGroupCustomers!.uncertain.customers.splice(
          uncertainIndex,
          1,
        )[0];
      _customer.latitude = locationUpdated.latitude;
      _customer.longitude = locationUpdated.longitude;
      this.uploadDataGroupCustomers!.edit.customers.push(_customer);
    } else if (unverifyIndex !== -1) {
      const _customer =
        this.uploadDataGroupCustomers!.unverify.customers.splice(
          unverifyIndex,
          1,
        )[0];
      _customer.latitude = locationUpdated.latitude;
      _customer.longitude = locationUpdated.longitude;
      this.uploadDataGroupCustomers!.edit.customers.push(_customer);
    }
    this.runMap.loadLocation(
      this.uploadDataGroupCustomers!,
      this.displayLocationType,
    );
  }

  updateCustomerGroup(customers: Array<CustomerUpdated>) {
    this.logger.log('new value customer details', customers);
    if (!customers?.length) return;
    customers.forEach((item) => {
      const existingIndex = this.customersLocationUpdated.findIndex(
        (i) => i.index === item.index && i.name === item.name,
      );
      if (existingIndex !== -1) {
        // Replace the existing entry
        this.customersLocationUpdated[existingIndex] = item;
      } else {
        // Add a new entry
        this.customersLocationUpdated.push(item);
      }

      // Find and remove the customer from uncertain
      const uncertainIndex =
        this.uploadDataGroupCustomers!.uncertain.customers.findIndex(
          (c) => c.name === item.name,
        );
      // Find and remove the customer from unverify
      const unverifyIndex =
        this.uploadDataGroupCustomers!.unverify.customers.findIndex(
          (c) => c.name === item.name,
        );
      if (uncertainIndex !== -1) {
        this.moveCustomerToEdit(
          this.uploadDataGroupCustomers!.uncertain.customers[uncertainIndex],
          {
            longitude: Number(item.longitude),
            latitude: Number(item.latitude),
          },
        );
      } else if (unverifyIndex !== -1) {
        this.moveCustomerToEdit(
          this.uploadDataGroupCustomers!.unverify.customers[unverifyIndex],
          {
            longitude: Number(item.longitude),
            latitude: Number(item.latitude),
          },
        );
      }
    });
  }

  isVerified(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.verify.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }

  isUncertain(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.uncertain.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }

  isUnverified(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.unverify.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }

  isEdited(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.edit.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }
}
