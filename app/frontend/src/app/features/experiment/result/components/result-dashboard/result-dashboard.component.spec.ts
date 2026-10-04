import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultDashboardComponent } from './result-dashboard.component';
import { configureResultPage } from '../../testing/result-page.testing';

describe('ResultDashboardComponent', () => {
  let component: ResultDashboardComponent;
  let fixture: ComponentFixture<ResultDashboardComponent>;

  beforeEach(async () => {
    await configureResultPage({ declarations: [ResultDashboardComponent] });
    fixture = TestBed.createComponent(ResultDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
