import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsumptionDialogComponent } from './consumption-dialog.component';

describe('ConsumptionDialogComponent', () => {
  let component: ConsumptionDialogComponent;
  let fixture: ComponentFixture<ConsumptionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsumptionDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsumptionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
