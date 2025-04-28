import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import {
  ActualLocation,
  Categories,
  Configuration,
} from 'src/app/models/configuration.model';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { DetailsDialogComponent } from '../../components/details-dialog/details-dialog.component';
import * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrl: './upload-file.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadFileComponent implements OnInit {
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
    private readonly ngbModal: NgbModal
  ) {}

  ngOnInit(): void {}

  onFileSelected(files: any) {
    console.log('onFileSelected', files);
    let file: File;
    if (files instanceof FileList) {
      file = files[0];
      if (files.length > 1) {
        this.toastr.warning('Cannot use multiple files');
      }
    } else {
      file = files.target.files[0];
      const target: DataTransfer = <DataTransfer>files.target;
      if (target.files.length > 1) {
        this.toastr.warning('Cannot use multiple files');
      }
    }
    if (file) {
      if (!this.validTypes.includes(file.type)) {
        this.alertInvalidation(
          'File Invalid',
          'Please select an Excel file (.xlsx or .xls)'
        );
      } else {
        // Proceed with file processing
        this.uploadFile(file);
      }
    }
  }

  resetFileInput(event: any): void {
    event.target.value = null;
  }

  /**
   * Shows a confirmation dialog asking the user to confirm the upload of the given file to the specified category.
   * If the user confirms, then the file is uploaded to the server.
   * @param file The file to be uploaded.
   */

  private async uploadFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      this.alertInvalidation('Invalid File', 'Could not read any worksheet.');
      return;
    }

    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, '_');

    const rawActual: string[] = (worksheet.getRow(1).values as any[])
      .slice(1)
      .map((h) => (h ?? '').toString())
      .filter((cell) => cell.trim() !== '' && cell !== 'Unnamed: 0');

    const rawExpected: string[] = [...this.headersColumns];

    const actualNorm = rawActual.map(normalize);
    const expectedNorm = rawExpected.map(normalize);

    console.log('actualNorm', actualNorm);
    console.log('expectedNorm', expectedNorm);

    const missingNorm = expectedNorm.filter((exp) => !actualNorm.includes(exp));
    if (missingNorm.length) {
      const missingRaw = rawExpected.filter((h) =>
        missingNorm.includes(normalize(h))
      );

      this.alertInvalidation(
        'Header Columns are incorrect.',
        `Expected Columns:<br>${rawExpected.join(', ')}<br><br>` +
          `Received Columns:<br>${rawActual.join(', ')}<br><br>` +
          `Missing Columns:<br>${missingRaw.join(', ')}<br><br>`
      );
      return;
    }

    const extraNorm = actualNorm.filter((act) => !expectedNorm.includes(act));
    if (extraNorm.length) {
      const extraRaw = rawActual.filter((h) =>
        extraNorm.includes(normalize(h))
      );
    }

    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = 'Upload File Confirmation';
    dialogRef.componentInstance.question = `Confirm uploading ${file.name} to category?`;
    dialogRef.componentInstance.message = `If you upload ${file.name} to the incorrect category, it will affect your route planning AI service.`;

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
    console.log(`alertInvalidation: title = ${title}, message = ${message}`);
    const dialogRef = this.ngbModal.open(DetailsDialogComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    dialogRef.result.then((confirmed: boolean) => {
      console.log(`alertInvalidation: confirmed = ${confirmed}`);
      if (confirmed) {
        console.log('confirmed');
      }
    });
  }
}
