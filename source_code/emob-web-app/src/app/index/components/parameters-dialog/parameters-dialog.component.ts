import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DynamicParameter, LocalizedText } from 'src/app/models/constraint.model';
import { TranslocoService } from '@jsverse/transloco';

interface GroupedParameters {
  category: string;
  items: Array<{ displayName: string; formattedValue: string }>;
}

@Component({
  selector: 'app-parameters-dialog',
  templateUrl: './parameters-dialog.component.html',
  styleUrl: './parameters-dialog.component.scss',
})
export class ParametersDialogComponent implements OnInit {
  @Input() dynamicParameters: DynamicParameter[] = [];

  public isLegacyFormat: boolean = false;
  public groupedParameters: GroupedParameters[] = [];

  constructor(
    private readonly activeModal: NgbActiveModal,
    private readonly transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    if (!this.dynamicParameters?.length) return;

    const firstParam = this.dynamicParameters[0];
    this.isLegacyFormat = !firstParam.category || typeof firstParam.category === 'string';

    this.groupedParameters = this.isLegacyFormat
      ? [{ category: '', items: this.mapToItems(this.dynamicParameters) }]
      : this.groupByCategory();
  }

  groupByCategory(): GroupedParameters[] {
    const seenCategories = new Set<string>();
    const categoryOrder: string[] = [];
    const groupsMap: Record<string, DynamicParameter[]> = {};

    this.dynamicParameters.forEach(param => {
      const category = this.getLocalized(param.category) || 'General';
      if (!seenCategories.has(category)) {
        seenCategories.add(category);
        categoryOrder.push(category);
      }
      (groupsMap[category] ??= []).push(param);
    });

    return categoryOrder.map(category => ({
      category,
      items: this.mapToItems(groupsMap[category])
    }));
  }

  mapToItems(params: DynamicParameter[]) {
    return params.map(param => ({
      displayName: this.getLocalized(param.displayName) || (this.isLegacyFormat ? param.keyName : ''),
      formattedValue: this.formatValue(param)
    }));
  }

  getLocalized(text?: LocalizedText | string | null): string {
    if (!text) return '';
    
    const localeKey = this.transloco.getActiveLang()?.toLowerCase().startsWith('th') ? 'th_TH' : 'en_US';
    
    if (typeof text === 'string') {
      try {
        return (JSON.parse(text) as LocalizedText)[localeKey] ?? '';
      } catch {
        return text;
      }
    }
    
    return text[localeKey] ?? '';
  }

  formatValue(param: DynamicParameter): string {
    const { value, valueType } = param;
    if (value == null) return this.transloco.translate('not_set');

    const type = (valueType || '').toLowerCase();
    const num = +value;

    switch (type) {
      case 'time':
        return String(value);
      case 'duration_hh:mm':
        return this.formatDuration(String(value));
      case 'number':
        return this.formatNumber(num);
      case 'number_kg':
        return `${this.formatNumber(num)} ${this.transloco.translate('kilogram')}`;
      case 'number_km':
        return `${this.formatNumber(num)} ${this.transloco.translate('kilometer')}`;
      default:
        return String(value);
    }
  }

  formatDuration(timeStr: string): string {
    if (!timeStr) return '';

    const [h, m] = timeStr.split(':');
    const hours = Number(h);
    const minutes = Number(m);

    if (!hours && !minutes) return this.transloco.translate('not_set');

    const parts = [];
    if (hours) parts.push(`${hours} ${this.transloco.translate('hours')}`);
    if (minutes) parts.push(`${minutes} ${this.transloco.translate('minutes')}`);
    
    return parts.join(' ');
  }

  formatNumber(num: number): string {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  onCancleClick() {
    this.activeModal.close(false);
  }

  onConfirmClick(): void {
    this.activeModal.close(true);
  }

  isNumericValue(value: string): boolean {
    return !isNaN(Number(value)) && value.trim() !== '';
  }
}
