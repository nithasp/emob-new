import { Component, Input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
import { Arrow } from '@ngx-popovers/core';
import { PopoverModule } from '@ngx-popovers/popover';

@Component({
  selector: 'app-dynamic-popover',
  templateUrl: './dynamic-popover.component.html',
  styleUrls: ['./dynamic-popover.component.scss'],
    standalone: true,
  imports: [ PopoverModule, Arrow, TranslocoModule, NgbTimepicker ],
})
export class DynamicPopoverComponent {
  @Input() placement: 'top'| 'bottom' | 'left' | 'right' | 'bottom-start' = 'bottom-start';
}
