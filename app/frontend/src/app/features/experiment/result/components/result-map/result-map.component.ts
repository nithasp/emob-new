import { Component } from '@angular/core';
import { ResultMapService } from '../../services/result-map.service';
import { getNumberValue } from '../../utils/number-value.utils';

@Component({
  selector: 'app-result-map',
  templateUrl: './result-map.component.html',
  styleUrl: './result-map.component.scss',
})
export class ResultMapComponent {
  protected readonly getNumberValue = getNumberValue;

  constructor(protected readonly resultMap: ResultMapService) {}
}
