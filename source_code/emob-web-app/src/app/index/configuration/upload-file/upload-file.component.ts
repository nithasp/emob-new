import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Categories } from 'src/app/models/configuration.model';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { DetailsDialogComponent } from '../../components/details-dialog/details-dialog.component';

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrl: './upload-file.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadFileComponent implements OnInit {
  @Input() name: string = '';

  public requiredFileType: string = '.xlsx, .xls';
  private readonly validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

  constructor(
    private readonly toastr: ToastrService,
    public readonly activeModal: NgbActiveModal,
    private readonly ngbModal: NgbModal
  ) {}
  ngOnInit(): void {}

  onFileSelected(files: any) {
    console.log(files);
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
       this.alertInvalidation("File Invalid","Please select an Excel file (.xlsx or .xls)");
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
  uploadFile(file: File) {
    console.log(`uploadFile: file = ${file.name}`);
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = 'Upload File Confirmation';
    dialogRef.componentInstance.question = `Confirm to upload ${file.name} to ${name} Category ?`;
    dialogRef.componentInstance.message = `If you upload ${file.name} to the incorrect ${name} category, it will affect your route planning AI service.`;

    dialogRef.result.then((confirmed: boolean) => {
      console.log(`uploadFile: confirmed = ${confirmed}`);
      if (confirmed) {
        console.log('confirmed');
      }
    });
  }
  alertInvalidation(title:string,message:string | string[]) {
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
