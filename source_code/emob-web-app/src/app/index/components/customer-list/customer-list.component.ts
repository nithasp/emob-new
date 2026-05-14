import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  DataGroup,
  Location,
  LocationType,
} from 'src/app/models/location.model';
import {
  Customer,
  CustomerProduct,
  CustomerSelected,
  CustomerUpdated,
  DataPreOrder,
  DetailsPreOrder,
  GroupedDataPreOrder
} from 'src/app/models/pre-order.model';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
})
export class CustomerListComponent implements OnInit {
  @Input() groupedDataPreOrder!: GroupedDataPreOrder;
  @Input() uploadDataGroupCustomers!: DataGroup;

  customersToVerify: Customer[] = [];
  public customersLocationUpdated: CustomerUpdated[] = [];
  customerSelected: CustomerSelected | null = null;

  selectedIndex: number = 0;

  constructor(private readonly ngbModalActive: NgbActiveModal) {}

  ngOnInit(): void {
    this.customersToVerify.push(
      ...this.uploadDataGroupCustomers.uncertain.customers
    );
    this.customersToVerify.push(
      ...this.uploadDataGroupCustomers.unverify.customers
    );
    this.selectData();
  }

  isDisabled(index: number): boolean {
    return this.selectedIndex !== null && this.selectedIndex !== index;
  }
  receiveData(locationUpdated: Location, customer: Customer): void {
    const existingIndex = this.customersLocationUpdated.findIndex(
      (item) => item.index === customer.index && item.name === customer.name
    );
    if (existingIndex !== -1) {
      // Replace the existing entry
      this.customersLocationUpdated[existingIndex] = {
        nodeId: customer.nodeId,
        index: customer.index,
        name: customer.name,
        latitude: locationUpdated.latitude,
        longitude: locationUpdated.longitude,
      };
    } else {
      // Add a new entry
      this.customersLocationUpdated.push({
        nodeId: customer.nodeId,
        index: customer.index,
        name: customer.name,
        latitude: locationUpdated.latitude,
        longitude: locationUpdated.longitude,
      });
    }
    this.customersToVerify = [];
    this.customersToVerify.push(
      ...this.uploadDataGroupCustomers.uncertain.customers
    );
    this.customersToVerify.push(
      ...this.uploadDataGroupCustomers.unverify.customers
    );
    this.customersToVerify = this.customersToVerify.filter(
      (customerToVerify) => {
        return !this.customersLocationUpdated.some(
          (updatedCustomer) => updatedCustomer.name === customerToVerify.name
        );
      }
    );
    if (this.customersToVerify.length < this.selectedIndex + 1) {
      this.selectedIndex = 0;
    }
    this.selectData();
  }
  selectData(): void {
    const selected = this.customersToVerify[this.selectedIndex];
    const keyed: DetailsPreOrder | undefined = selected?.name
      ? this.groupedDataPreOrder?.[selected.name]
      : undefined;
    const products: CustomerProduct[] =
      (selected?.productQuantity?.length
        ? (selected.productQuantity as CustomerProduct[])
        : null) ||
      (selected?.extra?.productsInfo as CustomerProduct[] | undefined) ||
      [];

    const base: DetailsPreOrder | DataPreOrder =
      keyed ??
      ({
        ORDERID_ORG: selected?.nodeId ?? '',
        CHANNEL: '',
        CUSTOMER_NAME: '',
        TEL: '',
        ADDRESS: selected?.originalAddress?.address || '',
        AUMPHER: selected?.originalAddress?.district || '',
        PROVINCE: selected?.originalAddress?.province || '',
        ZIPCODE: Number(selected?.originalAddress?.postalCode || 0),
        details: products.map((p) => ({
          PRODUCTID: String(p.productId || ''),
          ORDER_ID: p.skuCode || p.orderId || null,
          PRODUCTNAME: p.name || p.productName || '',
          QUANTITYMAIN: Number(p.productQuantity ?? p.quantityMajor ?? 0),
          QUANTITYMINOR: Number(p.quantityMinor ?? 0),
          UserConfirm: p.userConfirm || null,
          DateConfirm: p.dateConfirm || null,
        })),
      } satisfies DataPreOrder);

    // Match openCustomerOrderDetails in run.component: runtime customers use
    // additionalProperties + name, not only Excel-grouped rows or extra.*.
    const channel: string =
      selected?.additionalProperties?.channel ??
      base.CHANNEL ??
      selected?.extra?.channel ??
      '';
    const customerName: string =
      selected?.name ||
      base.CUSTOMER_NAME ||
      selected?.extra?.customerName ||
      '';
    const tel: string =
      selected?.additionalProperties?.telephone ??
      base.TEL ??
      selected?.extra?.tel ??
      '';

    const dataPreOrder: DetailsPreOrder | DataPreOrder = {
      ...base,
      CHANNEL: channel,
      CUSTOMER_NAME: customerName,
      TEL: tel,
    };

    this.customerSelected = {
      dataPreOrder,
      dataCustomer: selected,
      locationType: this.findLocationType(selected.name),
    };
  }
  isUncertain(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.uncertain.customers.some(
        (customer) => customer.name === orderId
      ) ?? false
    );
  }

  isUnverified(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.unverify.customers.some(
        (customer) => customer.name === orderId
      ) ?? false
    );
  }
  selectCustomer(customer: Customer): void {
    const idx = this.customersToVerify.findIndex(
      (c) => c.name === customer.name
    );
    this.selectedIndex = idx >= 0 ? idx : 0;
    console.log('Selected customer:', this.selectedIndex);
    this.selectData();
  }

  findLocationType(name: string): LocationType {
    // Find and remove the customer from uncertain
    const uncertainIndex =
      this.uploadDataGroupCustomers.uncertain.customers.findIndex(
        (c) => c.name === name
      );
    // Find and remove the customer from unverify
    const unverifyIndex =
      this.uploadDataGroupCustomers.unverify.customers.findIndex(
        (c) => c.name === name
      );
    const editIndex = this.uploadDataGroupCustomers.edit.customers.findIndex(
      (c) => c.name === name
    );
    if (uncertainIndex !== -1) {
      console.log('findLocationType Uncertain');
      return LocationType.Uncertain;
    } else if (unverifyIndex !== -1) {
      console.log('findLocationType Unverify');
      return LocationType.Unverify;
    } else if (editIndex !== -1) {
      console.log('findLocationType Edit');
      return LocationType.Edit;
    } else {
      console.log('findLocationType Verify');
      return LocationType.Verify;
    }
  }

  close(): void {
    this.ngbModalActive.close(this.customersLocationUpdated);
  }
}
