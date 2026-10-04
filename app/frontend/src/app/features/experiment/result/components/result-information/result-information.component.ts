import { Component } from '@angular/core';
import { ResultPlanService } from '../../services/result-plan.service';

@Component({
  selector: 'app-result-information',
  templateUrl: './result-information.component.html',
  styleUrl: './result-information.component.scss',
})
export class ResultInformationComponent {
  constructor(protected readonly plan: ResultPlanService) {}
}
