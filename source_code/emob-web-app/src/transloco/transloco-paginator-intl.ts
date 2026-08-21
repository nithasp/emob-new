import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoService } from '@jsverse/transloco';

@Injectable()
export class TranslocoPaginatorIntl extends MatPaginatorIntl {
  constructor(private transloco: TranslocoService) {
    super();

    this.transloco
      .selectTranslateObject<Record<string, string>>('paginator')
      .subscribe(() => {
        this.itemsPerPageLabel = this.transloco.translate(
          'paginator.items_per_page'
        );
        this.nextPageLabel = this.transloco.translate('paginator.next_page');
        this.previousPageLabel = this.transloco.translate(
          'paginator.previous_page'
        );
        this.firstPageLabel = this.transloco.translate('paginator.first_page');
        this.lastPageLabel = this.transloco.translate('paginator.last_page');

        const ofText = this.transloco.translate('paginator.of');
        this.getRangeLabel = (page, pageSize, length) => {
          if (length === 0 || pageSize === 0) {
            return `0 ${ofText} ${length}`;
          }
          const startIndex = page * pageSize;
          const endIndex =
            startIndex < length
              ? Math.min(startIndex + pageSize, length)
              : startIndex + pageSize;
          return `${startIndex + 1} – ${endIndex} ${ofText} ${length}`;
        };

        this.changes.next();
      });
  }
}
