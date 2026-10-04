import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultInformationComponent } from './result-information.component';
import { configureResultPage } from '../../testing/result-page.testing';

describe('ResultInformationComponent', () => {
  let component: ResultInformationComponent;
  let fixture: ComponentFixture<ResultInformationComponent>;

  beforeEach(async () => {
    await configureResultPage({ declarations: [ResultInformationComponent] });
    fixture = TestBed.createComponent(ResultInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
