import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { LicensePlateSelectionDialogComponent } from './license-plate-selection-dialog.component';
import { VehicleService } from 'src/app/services/vehicle.service';

describe('LicensePlateSelectionDialogComponent', () => {
  let component: LicensePlateSelectionDialogComponent;
  let fixture: ComponentFixture<LicensePlateSelectionDialogComponent>;

  let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;
  let mockVehicleService: jasmine.SpyObj<VehicleService>;

  beforeEach(async () => {
    mockActiveModal = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);
    mockVehicleService = jasmine.createSpyObj('VehicleService', ['getMyVehicles']);
    mockVehicleService.getMyVehicles.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [LicensePlateSelectionDialogComponent],
      providers: [
        { provide: NgbActiveModal, useValue: mockActiveModal },
        { provide: VehicleService, useValue: mockVehicleService },
      ],
    })
      // The template uses the *transloco structural directive and `| transloco`
      // pipe (via TranslocoModule), which needs a real TRANSLOCO_TRANSPILER
      // provider to render. Blanking the template avoids pulling that in,
      // matching the pattern used by vehicle-type-dialog.component.spec.ts.
      .overrideComponent(LicensePlateSelectionDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(LicensePlateSelectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
