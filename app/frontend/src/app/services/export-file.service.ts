import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import FileSaver from 'file-saver';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { ExportableData } from '../models/export.model';

@Injectable({
  providedIn: 'root',
})
export class ExportFileService {
  constructor(
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService
  ) {}

  public exportToCsv<T extends ExportableData>(
    data: T[],
    fileName: string
  ): void {
    if (!data || data.length === 0) {
      this.toastr.error(
        this.transloco.translate('export_no_data', {}, 'index'),
        this.transloco.translate('export_failed', {}, 'index')
      );
      return;
    }

    if (!fileName || fileName.trim() === '') {
      this.toastr.error(
        this.transloco.translate('export_no_file_name', {}, 'index'),
        this.transloco.translate('export_failed', {}, 'index')
      );
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    data.forEach((item) => {
      worksheet.addRow(Object.values(item));
    });

    workbook.csv.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
      FileSaver.saveAs(blob, `${fileName}.csv`);
    });
  }

  public exportMultipleCsv<T extends ExportableData>(
    dataSets: T[][],
    fileNames: string[]
  ): void {
    if (!dataSets || dataSets.length === 0) {
      this.toastr.error(
        this.transloco.translate('export_no_data', {}, 'index'),
        this.transloco.translate('export_failed', {}, 'index')
      );
      return;
    }

    if (!fileNames || fileNames.length === 0) {
      this.toastr.error(
        this.transloco.translate('export_no_file_names', {}, 'index'),
        this.transloco.translate('export_failed', {}, 'index')
      );
      return;
    }

    if (dataSets.length !== fileNames.length) {
      this.toastr.warning(
        this.transloco.translate(
          'export_dataset_count_mismatch',
          { datasetCount: dataSets.length, fileNameCount: fileNames.length },
          'index'
        ),
        this.transloco.translate('export_warning', {}, 'index')
      );
    }

    dataSets.forEach((data, index) => {
      this.exportToCsv(data, fileNames[index]);
    });
  }
}
