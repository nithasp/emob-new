import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultMapComponent } from './result-map.component';
import { configureResultPage } from '../../testing/result-page.testing';

describe('ResultMapComponent', () => {
  let component: ResultMapComponent;
  let fixture: ComponentFixture<ResultMapComponent>;

  beforeEach(async () => {
    await configureResultPage({ declarations: [ResultMapComponent] });
    fixture = TestBed.createComponent(ResultMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
