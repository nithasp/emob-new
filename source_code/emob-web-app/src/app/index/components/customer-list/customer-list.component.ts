import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DataGroup, Location, LocationType } from 'src/app/models/location.model';
import { Customer, CustomerUpdated, GroupedDataPreOrder } from 'src/app/models/pre-order.model';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit {
  @Input() groupedDataPreOrder!:GroupedDataPreOrder;
  @Input()uploadDataGroupCustomers!: DataGroup;
  indexSelected:number = 0;

  CustomersToVerify: Array<Customer>=[];
  public customersLocationUpdated: Array<CustomerUpdated> = [];

  constructor(private readonly ngbModalActive: NgbActiveModal){}

  ngOnInit(): void {
    this.CustomersToVerify.push(...this.uploadDataGroupCustomers.uncertain.customers);
    this.CustomersToVerify.push(...this.uploadDataGroupCustomers.unverify.customers);
  }

  receiveData(locationUpdated:Location,customer: Customer ) {
    const existingIndex = this.customersLocationUpdated.findIndex(
      (item) => item.index === customer.index && item.name === customer.name
    );
    if (existingIndex !== -1) {
      // Replace the existing entry
      this.customersLocationUpdated[existingIndex] = {
        index: customer.index,
        name: customer.name,
        latitude: locationUpdated.latitude,
        longitude: locationUpdated.longitude
      };
    } else {
      // Add a new entry
      this.customersLocationUpdated.push({
        index: customer.index,
        name: customer.name,
        latitude: locationUpdated.latitude,
        longitude: locationUpdated.longitude
      });
    }
    this.CustomersToVerify = [];
    this.CustomersToVerify.push(...this.uploadDataGroupCustomers.uncertain.customers);
    this.CustomersToVerify.push(...this.uploadDataGroupCustomers.unverify.customers);
    this.CustomersToVerify = this.CustomersToVerify.filter(customerToVerify => {
      return !this.customersLocationUpdated.some(updatedCustomer => updatedCustomer.name === customerToVerify.name);
    });
  }


  selectCustomer(customer: Customer) {
    this.indexSelected = this.CustomersToVerify.findIndex(
      (c) => c.name === customer.name
    );
    console.log('Selected customer:', this.indexSelected);
  }

  findLocationType(name:string):LocationType{

    // Find and remove the customer from uncertain
    const uncertainIndex = this.uploadDataGroupCustomers.uncertain.customers.findIndex(
      (c) => c.name === name
    );
    // Find and remove the customer from unverify
    const unverifyIndex = this.uploadDataGroupCustomers.unverify.customers.findIndex(
      (c) => c.name === name
    );
    const editIndex = this.uploadDataGroupCustomers.edit.customers.findIndex(
      (c) => c.name === name
    );
    if (uncertainIndex !== -1) {
      return LocationType.Uncertain;
     
    } else if (unverifyIndex !== -1) {
      return LocationType.Unverify;
    }
    else if (editIndex !== -1) {
      return LocationType.Edit;
    }else {
      return LocationType.Verify;
    }
    
  }

  close() {
    
    this.ngbModalActive.close(this.customersLocationUpdated);
  }
}
