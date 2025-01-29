import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumberCounterInputComponent } from './number-counter-input.component';

describe('NumberCounterInputComponent', () => {
  let component: NumberCounterInputComponent;
  let fixture: ComponentFixture<NumberCounterInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberCounterInputComponent]
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
