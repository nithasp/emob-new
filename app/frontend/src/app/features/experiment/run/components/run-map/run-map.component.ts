import { Component } from '@angular/core';
import { RunMapService } from '../../services/run-map.service';
import { RunOrderDataService } from '../../services/run-order-data.service';

@Component({
  selector: 'app-run-map',
  templateUrl: './run-map.component.html',
  styleUrl: './run-map.component.scss',
})
export class RunMapComponent {
  constructor(
    protected readonly runMap: RunMapService,
    protected readonly orders: RunOrderDataService,
  ) {}
}
