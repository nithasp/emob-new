import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import FileSaver from 'file-saver';
import { ExportableData } from '../models/export.model';

@Injectable({
  providedIn: 'root',
})
export class ExportFileService {
  constructor() {}

  public exportToCsv<T extends ExportableData>(
    data: T[],
    fileName: string
  ): void {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Check if data is not empty
    if (data && data.length > 0) {
      // Add column headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Add data rows
      data.forEach((item) => {
        worksheet.addRow(Object.values(item));
      });

      // Write to CSV
      workbook.csv.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
        FileSaver.saveAs(blob, `${fileName}.csv`);
      });
    } else {
      console.error('No data available to export');
    }
  }

  public exportMultipleCsv<T extends ExportableData>(
    dataSets: T[][],
    fileNames: string[]
  ): void {
    console.log(dataSets, fileNames);
    dataSets.forEach((data, index) => {
      this.exportToCsv(data, fileNames[index]);
    });
  }
}
