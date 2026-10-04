import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoService } from '@jsverse/transloco';
import { ToastrService } from 'ngx-toastr';
import * as ExcelJS from 'exceljs';

import { UploadFileComponent } from './upload-file.component';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { DialogDetailsComponent } from '@shared/components/dialogs/dialog-details/dialog-details.component';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLS_MIME = 'application/vnd.ms-excel';

function createFileList(...files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}

function createInputChangeEvent(...files: File[]): Event {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', { value: createFileList(...files) });
  return { target: input } as unknown as Event;
}

async function createExcelFile(
  headers: string[],
  name = 'config.xlsx'
): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Sheet1').addRow(headers);
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], name, { type: XLSX_MIME });
}

describe('UploadFileComponent', () => {
  let component: UploadFileComponent;
  let fixture: ComponentFixture<UploadFileComponent>;

  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let activeModalSpy: jasmine.SpyObj<NgbActiveModal>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;

  function createModalRef(
    result: Promise<unknown> = Promise.resolve(false)
  ): NgbModalRef {
    return { componentInstance: {}, result } as unknown as NgbModalRef;
  }

  function stubUploadFile(): jasmine.Spy {
    return spyOn(
      component as unknown as { uploadFile(file: File): Promise<void> },
      'uploadFile'
    );
  }

  function invokeUploadFile(file: File): Promise<void> {
    return (
      component as unknown as { uploadFile(file: File): Promise<void> }
    ).uploadFile(file);
  }

  beforeEach(async () => {
    toastrSpy = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
      'warning',
      'info',
    ]);
    activeModalSpy = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);
    ngbModalSpy = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    translocoSpy = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
    ]);
    translocoSpy.translate.and.callFake(((key: string) => key) as never);
    ngbModalSpy.open.and.callFake(() => createModalRef());

    await TestBed.configureTestingModule({
      declarations: [UploadFileComponent],
      providers: [
        { provide: ToastrService, useValue: toastrSpy },
        { provide: NgbActiveModal, useValue: activeModalSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: TranslocoService, useValue: translocoSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(UploadFileComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(UploadFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.requiredFileType).toBe('.xlsx, .xls');
  });

  describe('onFileSelected with a dropped FileList', () => {
    it('should upload a valid Excel file', () => {
      const file = new File(['dummy'], 'config.xlsx', { type: XLSX_MIME });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createFileList(file));

      expect(uploadSpy).toHaveBeenCalledWith(file);
      expect(toastrSpy.warning).not.toHaveBeenCalled();
    });

    it('should only warn and not upload when multiple files are dropped', () => {
      const file = new File(['dummy'], 'config.xlsx', { type: XLSX_MIME });
      const extra = new File(['dummy'], 'other.xlsx', { type: XLSX_MIME });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createFileList(file, extra));

      expect(toastrSpy.warning).toHaveBeenCalledWith('cannot_use_multiple_files');
      expect(uploadSpy).not.toHaveBeenCalled();
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });

    it('should do nothing for an empty FileList', () => {
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createFileList());

      expect(uploadSpy).not.toHaveBeenCalled();
      expect(toastrSpy.warning).not.toHaveBeenCalled();
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('onFileSelected with a file input change event', () => {
    it('should upload the selected file', () => {
      const file = new File(['dummy'], 'config.xlsx', { type: XLSX_MIME });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createInputChangeEvent(file));

      expect(uploadSpy).toHaveBeenCalledWith(file);
      expect(toastrSpy.warning).not.toHaveBeenCalled();
    });

    it('should only warn and not upload when multiple files are selected', () => {
      const file = new File(['dummy'], 'config.xlsx', { type: XLSX_MIME });
      const extra = new File(['dummy'], 'other.xlsx', { type: XLSX_MIME });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createInputChangeEvent(file, extra));

      expect(toastrSpy.warning).toHaveBeenCalledWith('cannot_use_multiple_files');
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('should do nothing when the event target has no files', () => {
      const uploadSpy = stubUploadFile();

      component.onFileSelected({
        target: document.createElement('div'),
      } as unknown as Event);

      expect(uploadSpy).not.toHaveBeenCalled();
      expect(toastrSpy.warning).not.toHaveBeenCalled();
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('Excel file validation', () => {
    it('should accept an Excel file even when the MIME type is empty', () => {
      const file = new File(['dummy'], 'config.xlsx', { type: '' });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createFileList(file));

      expect(uploadSpy).toHaveBeenCalledWith(file);
    });

    it('should accept a legacy .xls file', () => {
      const file = new File(['dummy'], 'legacy.xls', { type: XLS_MIME });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createFileList(file));

      expect(uploadSpy).toHaveBeenCalledWith(file);
    });

    it('should accept an uppercase file extension', () => {
      const file = new File(['dummy'], 'CONFIG.XLSX', { type: '' });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createFileList(file));

      expect(uploadSpy).toHaveBeenCalledWith(file);
    });

    it('should accept a valid Excel MIME type even with an unknown extension', () => {
      const file = new File(['dummy'], 'export.bin', { type: XLS_MIME });
      const uploadSpy = stubUploadFile();

      component.onFileSelected(createFileList(file));

      expect(uploadSpy).toHaveBeenCalledWith(file);
    });

    it('should reject a file with neither an Excel extension nor MIME type', () => {
      const file = new File(['dummy'], 'notes.txt', { type: 'text/plain' });
      const uploadSpy = stubUploadFile();
      const alertSpy = spyOn(component, 'alertInvalidation');

      component.onFileSelected(createFileList(file));

      expect(uploadSpy).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('file_invalid', 'select_excel_file');
    });
  });

  describe('resetFileInput', () => {
    it('should clear the input value so the same file can be re-selected', () => {
      const input = document.createElement('input');
      input.value = 'previous.xlsx';

      component.resetFileInput({ target: input } as unknown as Event);

      expect(input.value).toBe('');
    });
  });

  describe('uploadFile header validation', () => {
    beforeEach(() => {
      component.headersColumns = ['Charger Name', 'Location'];
    });

    it('should alert when the file content cannot be parsed as a workbook', async () => {
      const file = new File(['not a real workbook'], 'corrupt.xlsx', {
        type: XLSX_MIME,
      });
      const alertSpy = spyOn(component, 'alertInvalidation');

      await invokeUploadFile(file);

      expect(alertSpy).toHaveBeenCalledWith('file_invalid', 'cannot_read_file');
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
      expect(activeModalSpy.close).not.toHaveBeenCalled();
    });

    it('should alert when the workbook has no worksheet', async () => {
      const emptyWorkbook = new ExcelJS.Workbook();
      const buffer = await emptyWorkbook.xlsx.writeBuffer();
      const file = new File([buffer], 'empty.xlsx', { type: XLSX_MIME });
      const alertSpy = spyOn(component, 'alertInvalidation');

      await invokeUploadFile(file);

      expect(alertSpy).toHaveBeenCalledWith(
        'Invalid File',
        'Could not read any worksheet.'
      );
      expect(activeModalSpy.close).not.toHaveBeenCalled();
    });

    it('should alert with the missing columns when headers do not match', async () => {
      const file = await createExcelFile(['Charger Name', 'Something Else']);
      const alertSpy = spyOn(component, 'alertInvalidation');

      await invokeUploadFile(file);

      expect(alertSpy).toHaveBeenCalled();
      const [title, message] = alertSpy.calls.mostRecent().args as [
        string,
        string
      ];
      expect(title).toBe('header_columns_incorrect');
      expect(message).toContain('missing_columns');
      expect(message).toContain('expected_columns');
      expect(message).toContain('Location');
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
      expect(activeModalSpy.close).not.toHaveBeenCalled();
    });

    it('should match headers ignoring case, extra whitespace, and noise columns', async () => {
      const file = await createExcelFile([
        '  charger  name ',
        'LOCATION',
        'Unnamed: 0',
        '',
        'Extra Column',
      ]);
      const alertSpy = spyOn(component, 'alertInvalidation');

      await invokeUploadFile(file);

      expect(alertSpy).not.toHaveBeenCalled();
      expect(ngbModalSpy.open).toHaveBeenCalledWith(DialogConfirmationComponent, {
        centered: true,
        animation: true,
      });
    });
  });

  describe('uploadFile confirmation flow', () => {
    beforeEach(() => {
      component.headersColumns = ['Charger Name', 'Location'];
    });

    it('should ask for confirmation and close the modal with the file when confirmed', async () => {
      const file = await createExcelFile(
        ['Charger Name', 'Location'],
        'chargers.xlsx'
      );
      const modalRef = createModalRef(Promise.resolve(true));
      ngbModalSpy.open.and.returnValue(modalRef);

      await invokeUploadFile(file);
      await Promise.resolve();

      expect(ngbModalSpy.open).toHaveBeenCalledWith(DialogConfirmationComponent, {
        centered: true,
        animation: true,
      });
      expect(modalRef.componentInstance.title).toBe('upload_file_confirmation');
      expect(modalRef.componentInstance.question).toBe(
        'upload_file_confirmation_question'
      );
      expect(modalRef.componentInstance.message).toBe(
        'upload_file_confirmation_message'
      );
      expect(translocoSpy.translate).toHaveBeenCalledWith(
        'upload_file_confirmation_question',
        { fileName: 'chargers.xlsx' },
        'index'
      );
      expect(activeModalSpy.close).toHaveBeenCalledWith(file);
    });

    it('should keep the modal open when the upload is not confirmed', async () => {
      const file = await createExcelFile(['Charger Name', 'Location']);
      ngbModalSpy.open.and.returnValue(createModalRef(Promise.resolve(false)));

      await invokeUploadFile(file);
      await Promise.resolve();

      expect(activeModalSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('alertInvalidation', () => {
    it('should blur the focused element and show the details dialog', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      const blurSpy = spyOn(button, 'blur').and.callThrough();
      const modalRef = createModalRef();
      ngbModalSpy.open.and.returnValue(modalRef);

      component.alertInvalidation('file_invalid', ['line one', 'line two']);

      expect(blurSpy).toHaveBeenCalled();
      expect(ngbModalSpy.open).toHaveBeenCalledWith(DialogDetailsComponent, {
        centered: true,
        animation: true,
      });
      expect(modalRef.componentInstance.title).toBe('file_invalid');
      expect(modalRef.componentInstance.message).toEqual([
        'line one',
        'line two',
      ]);

      button.remove();
    });
  });
});
