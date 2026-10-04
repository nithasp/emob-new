import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoService } from '@jsverse/transloco';
import { ToastrService } from 'ngx-toastr';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { DialogDetailsComponent } from '@shared/components/dialogs/dialog-details/dialog-details.component';
import * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrl: './upload-file.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadFileComponent {
  @Input() category: string = '';
  @Input() type: string = '';
  @Input() name: string = '';
  @Input() headersColumns: string[] = [];

  public requiredFileType: string = '.xlsx, .xls';
  private readonly validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  constructor(
    private readonly toastr: ToastrService,
    public readonly activeModal: NgbActiveModal,
    private readonly ngbModal: NgbModal,
    private readonly transloco: TranslocoService
  ) {}

  onFileSelected(files: FileList | Event): void {
    let file: File | undefined;
    let fileCount = 0;

    if (files instanceof FileList) {
      file = files[0];
      fileCount = files.length;
    } else {
      const target = files.target as HTMLInputElement;
      if (target?.files) {
        file = target.files[0];
        fileCount = target.files.length;
      }
    }

    if (fileCount > 1) {
      this.toastr.warning(
        this.transloco.translate('cannot_use_multiple_files', {}, 'index')
      );
      return;
    }

    if (file) {
      if (!this.isValidExcelFile(file)) {
        this.alertInvalidation(
          this.transloco.translate('file_invalid', {}, 'index'),
          this.transloco.translate('select_excel_file', {}, 'index')
        );
      } else {
        this.uploadFile(file);
      }
    }
  }

  private isValidExcelFile(file: File): boolean {
    const name = (file.name || '').toLowerCase();
    const hasValidExtension = name.endsWith('.xlsx') || name.endsWith('.xls');
    const hasValidMime = this.validTypes.includes(file.type);
    return hasValidExtension || hasValidMime;
  }

  resetFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      target.value = '';
    }
  }

  private async uploadFile(file: File) {
    const workbook = new ExcelJS.Workbook();
    try {
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
    } catch {
      this.alertInvalidation(
        this.transloco.translate('file_invalid', {}, 'index'),
        this.transloco.translate('cannot_read_file', {}, 'index')
      );
      return;
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      this.alertInvalidation('Invalid File', 'Could not read any worksheet.');
      return;
    }

    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, '_');

    const headerRow = worksheet.getRow(1);
    const rawActual: string[] = (Array.isArray(headerRow.values) ? headerRow.values : [])
      .slice(1)
      .map((cell) => (cell ?? '').toString())
      .filter((cellValue) => cellValue.trim() !== '' && cellValue !== 'Unnamed: 0');

    const rawExpected: string[] = [...this.headersColumns];

    const actualNorm = rawActual.map(normalize);
    const expectedNorm = rawExpected.map(normalize);

    const missingNorm = expectedNorm.filter((exp) => !actualNorm.includes(exp));
    if (missingNorm.length) {
      const missingRaw = rawExpected.filter((h) =>
        missingNorm.includes(normalize(h))
      );

      this.alertInvalidation(
        this.transloco.translate('header_columns_incorrect', {}, 'index'),
        `<div>
          <div class="mb-1">
            <p class="mb-0">${this.transloco.translate('missing_columns', {}, 'index')}</p>
            <p>${missingRaw.join(', ')}</p>
          </div>
          <div class="text-muted small">
            <p class="mb-0">${this.transloco.translate('expected_columns', {}, 'index')}</p>
            <p>${rawExpected.join(', ')}</p>
          </div>
        </div>`
      );

      return;
    }

    const dialogRef = this.ngbModal.open(DialogConfirmationComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = this.transloco.translate('upload_file_confirmation', {}, 'index');
    dialogRef.componentInstance.question = this.transloco.translate('upload_file_confirmation_question', { fileName: file.name }, 'index');
    dialogRef.componentInstance.message = this.transloco.translate('upload_file_confirmation_message', { fileName: file.name }, 'index');

    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.activeModal.close(file);
      }
    });
  }

  alertInvalidation(title: string, message: string | string[]) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(DialogDetailsComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;
  }
}
