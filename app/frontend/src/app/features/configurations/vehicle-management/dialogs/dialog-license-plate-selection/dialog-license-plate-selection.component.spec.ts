import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { DialogLicensePlateSelectionComponent } from './dialog-license-plate-selection.component';
import { VehicleService } from '../../../services/vehicle.service';

describe('DialogLicensePlateSelectionComponent', () => {
  let component: DialogLicensePlateSelectionComponent;
  let fixture: ComponentFixture<DialogLicensePlateSelectionComponent>;

  let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;
  let mockVehicleService: jasmine.SpyObj<VehicleService>;

  beforeEach(async () => {
    mockActiveModal = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);
    mockVehicleService = jasmine.createSpyObj('VehicleService', ['getMyVehicles']);
    mockVehicleService.getMyVehicles.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DialogLicensePlateSelectionComponent],
      providers: [
        { provide: NgbActiveModal, useValue: mockActiveModal },
        { provide: VehicleService, useValue: mockVehicleService },
      ],
    })
      // The template uses the *transloco structural directive and `| transloco`
      // pipe (via TranslocoModule), which needs a real TRANSLOCO_TRANSPILER
      // provider to render. Blanking the template avoids pulling that in,
      // matching the pattern used by vehicle-type-dialog.component.spec.ts.
      .overrideComponent(DialogLicensePlateSelectionComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DialogLicensePlateSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
