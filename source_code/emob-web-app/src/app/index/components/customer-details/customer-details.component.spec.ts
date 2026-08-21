import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import {
  NgbActiveModal,
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslocoService } from '@jsverse/transloco';
import { ToastrService } from 'ngx-toastr';

import { CustomerDetailsComponent } from './customer-details.component';
import { MarkLocationDialogComponent } from '../mark-location-dialog/mark-location-dialog.component';
import {
  Customer,
  DetailsPreOrder,
  ReplaceType,
  ValidationType,
  getDescription,
} from 'src/app/models/pre-order.model';
import { LocationType } from 'src/app/models/location.model';

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    deliveryWeight: 10,
    index: 0,
    isDepot: false,
    latitude: 13.75,
    longitude: 100.5,
    metrics: null,
    name: 'Test Customer',
    nodeId: 'N1',
    originalAddress: {
      address: '123 Main St',
      district: null,
      postalCode: null,
      province: null,
      subdistrict: null,
    },
    pickupWeight: 0,
    processedAddress: {
      address: '123 Main St',
      district: null,
      postalCode: null,
      province: null,
      subdistrict: null,
    },
    replaceType: ReplaceType.NO_REPLACE,
    required: true,
    serviceDuration: 0,
    timeWindowEarly: 0,
    timeWindowLate: 0,
    validationType: ValidationType.SUBDISTRICT_LEVEL,
    deliveryVolume: 0,
    pickupVolume: 0,
    zone: 'A',
    extra: {
      orderId: null,
      channel: null,
      customerName: 'Test Customer',
      tel: null,
      productsInfo: [],
    },
    ...overrides,
  };
}

describe('CustomerDetailsComponent', () => {
  let component: CustomerDetailsComponent;
  let fixture: ComponentFixture<CustomerDetailsComponent>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let ngbActiveModalSpy: jasmine.SpyObj<NgbActiveModal>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    ngbModalSpy = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    ngbActiveModalSpy = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);
    toastrSpy = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    translocoSpy = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
    ]);
    translocoSpy.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      declarations: [CustomerDetailsComponent],
      providers: [
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: NgbActiveModal, useValue: ngbActiveModalSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: TranslocoService, useValue: translocoSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Replace the template so we don't pull in transloco pipes/ol map DOM.
      .overrideComponent(CustomerDetailsComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(CustomerDetailsComponent);
    component = fixture.componentInstance;
    component.dataCustomer = createCustomer();
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should seed location from dataCustomer on init', () => {
    expect(component.location.latitude).toBe(13.75);
    expect(component.location.longitude).toBe(100.5);
  });

  it('should build an icon style for every location type', () => {
    expect(component.iconStyle.verify).toBeTruthy();
    expect(component.iconStyle.uncertain).toBeTruthy();
    expect(component.iconStyle.unverify).toBeTruthy();
    expect(component.iconStyle.edit).toBeTruthy();
  });

  describe('setLocation branching (via refreshLocation)', () => {
    it('marks the customer verified for NO_REPLACE + SUBDISTRICT_LEVEL', () => {
      component.dataCustomer = createCustomer({
        replaceType: ReplaceType.NO_REPLACE,
        validationType: ValidationType.SUBDISTRICT_LEVEL,
      });
      component.refreshLocation();

      expect(component.isVerified()).toBeTrue();
      expect(component.isUncertain()).toBeFalse();
      expect(component.isUnverified()).toBeFalse();
    });

    it('marks the customer uncertain for a SUBDISTRICT_LEVEL replaceType', () => {
      component.dataCustomer = createCustomer({
        replaceType: ReplaceType.SUBDISTRICT_LEVEL,
      });
      component.refreshLocation();

      expect(component.isUncertain()).toBeTrue();
      expect(component.isVerified()).toBeFalse();
    });

    it('marks the customer unverified for a NO_VALID validationType', () => {
      component.dataCustomer = createCustomer({
        replaceType: ReplaceType.GEOCODE,
        validationType: ValidationType.NO_VALID,
      });
      component.refreshLocation();

      expect(component.isUnverified()).toBeTrue();
      expect(component.isVerified()).toBeFalse();
    });

    it('marks the customer edited when locationType is Edit and the component is a modal', () => {
      component.isModal = true;
      component.locationType = LocationType.Edit;
      component.dataCustomer = createCustomer();
      component.refreshLocation();

      expect(component.isEdited()).toBeTrue();
    });

    it('leaves the previous locationType untouched when no condition matches', () => {
      component.locationType = LocationType.Uncertain;
      component.dataCustomer = createCustomer({
        replaceType: ReplaceType.GEOCODE,
        validationType: ValidationType.DISTRICT_LEVEL,
      });
      component.refreshLocation();

      expect(component.locationType).toBe(LocationType.Uncertain);
    });
  });

  it('getEnumDescription() should delegate to getDescription()', () => {
    expect(component.getEnumDescription(ReplaceType.NO_REPLACE)).toBe(
      getDescription(ReplaceType.NO_REPLACE)
    );
  });

  it('convertDateString() should parse dd/mm/yyyy hh:mm strings', () => {
    const date = component.convertDateString('16/07/2026 10:30');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(16);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(30);
  });

  describe('detailRows', () => {
    it('returns the details array when dataPreOrder is set', () => {
      const details = [
        { PRODUCTID: 'P1' },
      ] as unknown as DetailsPreOrder['details'];
      component.dataPreOrder = { details } as DetailsPreOrder;
      expect(component.detailRows).toEqual(details);
    });

    it('returns an empty array when dataPreOrder is null', () => {
      component.dataPreOrder = null;
      expect(component.detailRows).toEqual([]);
    });
  });

  it('close() should close the active modal with the current location', () => {
    component.close();
    expect(ngbActiveModalSpy.close).toHaveBeenCalledWith(component.location);
  });

  describe('ngOnChanges', () => {
    it('does not refresh on the first change', () => {
      spyOn(component, 'refreshLocation');
      component.ngOnChanges({
        dataCustomer: new SimpleChange(
          null,
          createCustomer({ name: 'A' }),
          true
        ),
      });
      expect(component.refreshLocation).not.toHaveBeenCalled();
    });

    it('refreshes when the customer name changes on a later change', () => {
      spyOn(component, 'refreshLocation');
      component.ngOnChanges({
        dataCustomer: new SimpleChange(
          null,
          createCustomer({ name: 'A' }),
          true
        ),
      });
      component.ngOnChanges({
        dataCustomer: new SimpleChange(
          createCustomer({ name: 'A' }),
          createCustomer({ name: 'B' }),
          false
        ),
      });
      expect(component.refreshLocation).toHaveBeenCalledTimes(1);
    });

    it('does not refresh when the customer name is unchanged on a later change', () => {
      spyOn(component, 'refreshLocation');
      component.ngOnChanges({
        dataCustomer: new SimpleChange(
          null,
          createCustomer({ name: 'A' }),
          true
        ),
      });
      component.ngOnChanges({
        dataCustomer: new SimpleChange(
          createCustomer({ name: 'A' }),
          createCustomer({ name: 'A' }),
          false
        ),
      });
      expect(component.refreshLocation).not.toHaveBeenCalled();
    });
  });

  describe('markLocation()', () => {
    it('opens MarkLocationDialogComponent seeded with the customer location', () => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: new Promise(() => {}),
      } as unknown as NgbModalRef);

      component.markLocation();

      expect(ngbModalSpy.open).toHaveBeenCalledWith(
        MarkLocationDialogComponent,
        jasmine.objectContaining({ centered: true })
      );
      const modalRef = ngbModalSpy.open.calls.mostRecent().returnValue;
      expect(modalRef.componentInstance.location).toEqual({
        longitude: component.dataCustomer.longitude,
        latitude: component.dataCustomer.latitude,
      });
    });

    it('updates the location, emits, and shows a toast on a successful result', fakeAsync(() => {
      const resolvedLocation = { latitude: 14, longitude: 101 };
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(resolvedLocation),
      } as unknown as NgbModalRef);
      spyOn(component.dataEmitter, 'emit');

      component.markLocation();
      tick();

      expect(component.location.latitude).toBe(14);
      expect(component.location.longitude).toBe(101);
      expect(component.locationType).toBe(LocationType.Edit);
      expect(component.dataEmitter.emit).toHaveBeenCalledWith(
        component.location
      );
      expect(toastrSpy.success).toHaveBeenCalled();
    }));

    it('does not update the location when the dialog is dismissed', fakeAsync(() => {
      spyOn(console, 'error');
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.reject('dismissed'),
      } as unknown as NgbModalRef);
      const previousLocation = { ...component.location };

      component.markLocation();
      tick();

      expect(component.location).toEqual(previousLocation);
      expect(toastrSpy.success).not.toHaveBeenCalled();
    }));
  });
});
