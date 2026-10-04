import { Component } from '@angular/core';
import { ResultPlanService } from '../../services/result-plan.service';
import { getNumberValue, isNumber } from '../../utils/number-value.utils';

@Component({
  selector: 'app-result-dashboard',
  templateUrl: './result-dashboard.component.html',
  styleUrl: './result-dashboard.component.scss',
})
export class ResultDashboardComponent {
  vrpStatsView: 'keyvalue' | 'dashboard' = 'dashboard';

  protected readonly isNumber = isNumber;
  protected readonly getNumberValue = getNumberValue;

  constructor(protected readonly plan: ResultPlanService) {}
}
