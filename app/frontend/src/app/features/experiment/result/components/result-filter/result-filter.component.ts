import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FilterCriteria } from '@shared/models/common.model';
import { LanguageChangeService } from '@core/services/language-change.service';
import { LoggerService } from '@core/services/logger.service';
import { RouteInfo } from '../../../models/location.model';
import { ResultPlanService } from '../../services/result-plan.service';
import { ResultMapService } from '../../services/result-map.service';
import { ROUTE_COLUMNS } from '../../utils/route-columns.utils';

@Component({
  selector: 'app-result-filter',
  templateUrl: './result-filter.component.html',
  styleUrl: './result-filter.component.scss',
})
export class ResultFilterComponent implements OnInit, AfterViewInit {
  private readonly logger = inject(LoggerService);

  @ViewChild('filterModal', { static: false, read: TemplateRef })
  filterModal!: TemplateRef<unknown>;
  @ViewChild('chipListbox') chipListbox!: ElementRef<HTMLElement>;
  public activeFilters: Array<{
    column: string;
    criteria: string;
    value: string;
  }> = [];
  searchControl = new FormControl<string>('');
  showFilterPanel = false;
  filterCriteriaToDisplay: string[] = [
    'equal',
    'does_not_equal',
    'greater_than',
    'greater_than_or_equal',
    'less_than',
    'less_than_or_equal',
    'contains',
    'does_not_contain',
    'starts_with',
    'does_not_start_with',
    'ends_with',
    'does_not_end_with',
  ];
  selectedFilterCriteria: string = 'equal';
  selectedSearchOption: string = 'routeLabel';
  hasOverflow: boolean = false;
  showAllLines: boolean = false;

  columnsToDisplay: string[] = ROUTE_COLUMNS;

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly languageChangeService: LanguageChangeService,
    protected readonly plan: ResultPlanService,
    private readonly resultMap: ResultMapService,
  ) {}

  ngOnInit(): void {
    // Only a loaded plan hands the table over to this filter and starts the language listener;
    // while the plan is loading, or after it failed to load, both stay off
    this.plan.planLoaded$.subscribe(() => {
      this.plan.dataRouteInfo.filterPredicate =
        this.multiFilterPredicate.bind(this);

      this.checkFilterOverflowTwolinesWhenLanguageChange();
    });
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.checkOverflow();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkOverflow(), 0);
  }

  checkFilterOverflowTwolinesWhenLanguageChange() {
    this.languageChangeService.langToggled$.subscribe(() => {
      this.applyFilter();
      setTimeout(() => this.checkOverflow(), 0);
    });
  }

  evaluateFilter(
    column: string,
    rawValue: number,
    searchValue: string,
    crit?: string
  ): boolean {
    this.logger.log('rawValue', rawValue);

    const critUsed = crit ?? this.selectedFilterCriteria;
    const search = searchValue.trim().toLowerCase();
    let displayValue: number | string;
    switch (column) {
      case 'serviceTime':
        displayValue = Number(rawValue) / 60;
        break;
      case 'travelDuration':
        displayValue = Number((Number(rawValue) / 60).toFixed(2));
        break;
      case 'travelDistance':
      case 'weight':
        displayValue = Math.round(Number(rawValue));
        break;
      default:
        displayValue = rawValue;
    }
    const dvStr = displayValue.toString().toLowerCase();
    const dvNum =
      typeof displayValue === 'number' ? displayValue : Number(dvStr);

    switch (critUsed) {
      case 'equal':
        return !isNaN(dvNum) ? dvNum === Number(search) : dvStr === search;
      case 'does_not_equal':
        return !isNaN(dvNum) ? dvNum !== Number(search) : dvStr !== search;
      case 'greater_than':
        return !isNaN(dvNum) && dvNum > Number(search);
      case 'greater_than_or_equal':
        return !isNaN(dvNum) && dvNum >= Number(search);
      case 'less_than':
        return !isNaN(dvNum) && dvNum < Number(search);
      case 'less_than_or_equal':
        return !isNaN(dvNum) && dvNum <= Number(search);
      case 'contains':
        return dvStr.includes(search);
      case 'does_not_contain':
        return !dvStr.includes(search);
      case 'starts_with':
        return dvStr.startsWith(search);
      case 'does_not_start_with':
        return !dvStr.startsWith(search);
      case 'ends_with':
        return dvStr.endsWith(search);
      case 'does_not_end_with':
        return !dvStr.endsWith(search);
      default:
        return false;
    }
  }

  multiFilterPredicate(data: RouteInfo, filter: string): boolean {
    if (!filter) return true;
    const filters = JSON.parse(filter) as FilterCriteria[];

    return filters.some((f) =>
      this.evaluateFilter(
        f.column,
        data[f.column as keyof RouteInfo] as number,
        f.value,
        f.criteria
      )
    );
  }

  applyFilter(): void {
    const raw = this.searchControl.value?.toString().trim();
    if (!raw) return;

    this.activeFilters.push({
      column: this.selectedSearchOption,
      criteria: this.selectedFilterCriteria,
      value: raw,
    });

    this.searchControl.setValue('');

    this.plan.dataRouteInfo.filter = JSON.stringify(this.activeFilters);

    setTimeout(() => this.checkOverflow(), 0);
  }

  removeFilter(filt: { column: string; criteria: string; value: string }) {
    this.activeFilters = this.activeFilters.filter((x) => x !== filt);
    this.plan.dataRouteInfo.filter = this.activeFilters.length
      ? JSON.stringify(this.activeFilters)
      : '';

    if (this.activeFilters.length === 0) {
      this.resultMap.resetRouteMapUi();
    }

    setTimeout(() => {
      this.checkOverflow();
      this.resultMap.applyMapFilter();
      if (this.showAllLines && !this.hasOverflow) {
        this.showAllLines = false;
      }
    }, 0);
  }

  setSearchOption(value: string) {
    this.selectedSearchOption = value;
  }

  setSelectedFilterCriteria(value: string) {
    this.selectedFilterCriteria = value;
    this.applyFilter();
  }

  openFilter(): void {
    this.ngbModal.open(this.filterModal, {
      size: 'lg',
      backdrop: false,
      centered: false,
      windowClass: 'filter-modal-window',
      modalDialogClass: 'filter-modal',
    });
    setTimeout(() => this.positionFilterModal(), 0);
  }

  positionFilterModal() {
    const dialog = document.querySelector(
      '.filter-modal-window .modal-dialog'
    ) as HTMLElement;
    if (!dialog) return;

    dialog.style.position = 'absolute';
    dialog.style.margin = '0';
    dialog.style.transform = 'none';

    if (window.innerWidth >= 768) {
      const wrapper = document.querySelector(
        '.filter-button-wrapper'
      ) as HTMLElement;
      if (!wrapper) return;

      const wr = wrapper.getBoundingClientRect();
      const margin = 8;

      const aboveTop = wr.top - dialog.offsetHeight - margin;
      dialog.style.top = `${aboveTop}px`;
      dialog.style.left = `${wr.left + 50}px`;

      const rect = dialog.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        const belowTop = wr.bottom + margin;
        dialog.style.top = `${belowTop}px`;
      }
    } else {
      dialog.style.top = '50%';
      dialog.style.left = '50%';
      dialog.style.transform = 'translate(-50%, -50%)';
    }
  }

  onAddFilter(modal: NgbModalRef): void {
    const raw = this.searchControl.value?.toString().trim();
    if (raw) {
      this.activeFilters.push({
        column: this.selectedSearchOption,
        criteria: this.selectedFilterCriteria,
        value: raw,
      });
      this.plan.dataRouteInfo.filter = JSON.stringify(this.activeFilters);
      this.searchControl.setValue('');
      this.resultMap.applyMapFilter();
    }
    modal.close();

    setTimeout(() => this.checkOverflow(), 0);
  }

  clearFilter(): void {
    this.searchControl.setValue('');
    this.plan.dataRouteInfo.filter = '';
    this.activeFilters = [];
    this.resultMap.applyMapFilter();

    if (this.activeFilters.length === 0) {
      this.resultMap.resetRouteMapUi();
    }

    setTimeout(() => {
      this.checkOverflow();
      this.showAllLines = false;
      this.hasOverflow = false;
    }, 0);
  }

  checkOverflow() {
    const chipListbox = document.querySelector('.chipListbox') as HTMLElement;
    if (!chipListbox) return;

    const chips = Array.from(
      chipListbox.querySelectorAll('mat-chip')
    ) as HTMLElement[];
    if (chips.length === 0) {
      this.hasOverflow = false;
      this.showAllLines = false;
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = '';
      return;
    }

    const rowTops = new Set<number>();
    chips.forEach((chip) => {
      const { top } = chip.getBoundingClientRect();
      rowTops.add(Math.round(top));
    });
    const numRows = rowTops.size;

    this.hasOverflow = numRows > 2;
    if (!this.hasOverflow) {
      this.showAllLines = false;
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = '';
    } else if (!this.showAllLines) {
      const containerTop = chipListbox.getBoundingClientRect().top;
      const sortedChips = chips.sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      );

      const secondRowTop = Array.from(rowTops).sort((a, b) => a - b)[1];
      const chipsInSecondRow = sortedChips.filter(
        (c) => Math.round(c.getBoundingClientRect().top) === secondRowTop
      );
      const bottomOfRow2 = Math.max(
        ...chipsInSecondRow.map((c) => c.getBoundingClientRect().bottom)
      );
      const maxH = bottomOfRow2 - containerTop;

      chipListbox.classList.add('lines-ellipsis');
      chipListbox.style.maxHeight = `${maxH}px`;
    }
  }

  toggleOverflow(): void {
    const chipListbox = document.querySelector(
      '.chipListbox'
    ) as HTMLElement | null;
    if (!chipListbox) return;

    const firstChip = chipListbox.querySelector(
      'mat-chip'
    ) as HTMLElement | null;
    if (!firstChip) return;
    const cs = window.getComputedStyle(firstChip);
    const chipH = firstChip.offsetHeight;
    const chipM = parseFloat(cs.marginBottom);
    const collapsedH = (chipH + chipM) * 2;

    if (!this.showAllLines) {
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = `${chipListbox.scrollHeight + 3 + 10}px`;

      const onExpand = (e: TransitionEvent) => {
        if (e.propertyName === 'max-height') {
          chipListbox.style.maxHeight = '';
          chipListbox.removeEventListener('transitionend', onExpand);
        }
      };
      chipListbox.addEventListener('transitionend', onExpand);
    } else {
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = `${chipListbox.scrollHeight + 3 + 8}px`;

      requestAnimationFrame(() => {
        chipListbox.style.maxHeight = `${collapsedH + 3 + 8}px`;
      });

      const onCollapse = (e: TransitionEvent) => {
        if (e.propertyName === 'max-height') {
          chipListbox.classList.add('lines-ellipsis');
          chipListbox.removeEventListener('transitionend', onCollapse);
        }
      };
      chipListbox.addEventListener('transitionend', onCollapse);
    }

    this.showAllLines = !this.showAllLines;
    this.resultMap.applyMapFilter();
  }
}
