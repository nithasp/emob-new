import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkLocationDialogComponent } from './mark-location-dialog.component';

describe('MarkLocationDialogComponent', () => {
  let component: MarkLocationDialogComponent;
  let fixture: ComponentFixture<MarkLocationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkLocationDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarkLocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
