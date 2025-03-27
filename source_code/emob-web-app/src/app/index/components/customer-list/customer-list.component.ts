import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  DataGroup,
  Location,
  LocationType,
} from 'src/app/models/location.model';
import {
  Customer,
  CustomerUpdated,
  DetailsPreOder,
  GroupedDataPreOrder,
} from 'src/app/models/pre-order.model';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
})
export class CustomerListComponent implements OnInit {
  @Input() groupedDataPreOrder!: GroupedDataPreOrder;
  @Input() uploadDataGroupCustomers!: DataGroup;

  customersToVerify: Array<Customer> = [];
  public customersLocationUpdated: Array<CustomerUpdated> = [];
  customerSelected: {
    dataPreOder: DetailsPreOder;
    dataCustomer: Customer;
    locationType: LocationType;
  } | null = null;

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
  receiveData(locationUpdated: Location, customer: Customer) {
    const existingIndex = this.customersLocationUpdated.findIndex(
      (item) => item.index === customer.index && item.name === customer.name
    );
    if (existingIndex !== -1) {
      // Replace the existing entry
      this.customersLocationUpdated[existingIndex] = {
        node_id: customer.node_id,
        index: customer.index,
        name: customer.name,
        latitude: locationUpdated.latitude,
        longitude: locationUpdated.longitude,
      };
    } else {
      // Add a new entry
      this.customersLocationUpdated.push({
        node_id: customer.node_id,
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
  selectData() {
    this.customerSelected = {
      dataPreOder:
        this.groupedDataPreOrder[
          this.customersToVerify[this.selectedIndex].name
        ],
      dataCustomer: this.customersToVerify[this.selectedIndex],
      locationType: this.findLocationType(
        this.customersToVerify[this.selectedIndex].name
      ),
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
  selectCustomer(customer: Customer) {
    this.selectedIndex =
      this.customersToVerify.findIndex((c) => c.name === customer.name) || 0;
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

  close() {
    this.ngbModalActive.close(this.customersLocationUpdated);
  }
}
