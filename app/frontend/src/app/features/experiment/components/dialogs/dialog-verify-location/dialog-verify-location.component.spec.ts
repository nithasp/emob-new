import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { DialogVerifyLocationComponent } from './dialog-verify-location.component';

describe('DialogVerifyLocationComponent', () => {
  let component: DialogVerifyLocationComponent;
  let fixture: ComponentFixture<DialogVerifyLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DialogVerifyLocationComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DialogVerifyLocationComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DialogVerifyLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
