import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoTestingModule } from '@jsverse/transloco';
import * as OlProj from 'ol/proj';
import type MapBrowserEvent from 'ol/MapBrowserEvent';

import { DialogMarkLocationComponent } from './dialog-mark-location.component';

describe('DialogMarkLocationComponent', () => {
  let component: DialogMarkLocationComponent;
  let fixture: ComponentFixture<DialogMarkLocationComponent>;
  let activeModalSpy: jasmine.SpyObj<NgbActiveModal>;

  beforeEach(async () => {
    activeModalSpy = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);

    await TestBed.configureTestingModule({
      declarations: [DialogMarkLocationComponent],
      imports: [
        CommonModule,
        FormsModule,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [{ provide: NgbActiveModal, useValue: activeModalSpy }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogMarkLocationComponent);
    component = fixture.componentInstance;
    component.location = { latitude: 13.7563, longitude: 100.5018 };
    component.address = '123 Test Street';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should place a single initial marker on the map after view init', () => {
    expect(component.vectorSource.getFeatures().length).toBe(1);
  });

  it('should not be in edit mode initially', () => {
    expect(component.isEditLocation).toBeFalse();
  });

  it('markerMap() should update the location and enter edit mode', async () => {
    const coordinate = OlProj.fromLonLat([100.6, 13.8]);
    const fakeEvent = { coordinate } as unknown as MapBrowserEvent<
      PointerEvent | KeyboardEvent | WheelEvent
    >;

    await component.markerMap(fakeEvent);

    expect(component.isEditLocation).toBeTrue();
    expect(component.location.longitude).toBeCloseTo(100.6, 4);
    expect(component.location.latitude).toBeCloseTo(13.8, 4);
    expect(component.vectorSource.getFeatures().length).toBe(1);
  });

  it('updateLocation() should enter edit mode and keep a single marker', () => {
    component.updateLocation();
    expect(component.isEditLocation).toBeTrue();
    expect(component.vectorSource.getFeatures().length).toBe(1);
  });

  it('closeLocation() should show an error and not close the modal when nothing was edited', () => {
    component.closeLocation();
    expect(component.messageError).toBeTrue();
    expect(activeModalSpy.close).not.toHaveBeenCalled();
  });

  it('closeLocation() should close the modal with the location once edited', () => {
    component.updateLocation();
    component.closeLocation();
    expect(activeModalSpy.close).toHaveBeenCalledWith(component.location);
  });

  it('cancel() should close the modal with null', () => {
    component.cancel();
    expect(activeModalSpy.close).toHaveBeenCalledWith(null);
  });
});
