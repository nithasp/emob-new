import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { NumberCounterInputComponent } from './number-counter-input.component';

describe('NumberCounterInputComponent', () => {
  let component: NumberCounterInputComponent;
  let fixture: ComponentFixture<NumberCounterInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NumberCounterInputComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(NumberCounterInputComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NumberCounterInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
