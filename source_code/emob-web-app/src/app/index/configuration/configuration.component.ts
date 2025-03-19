import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Categories, Configuration } from 'src/app/models/configuration.model';
import { ConfigurationService } from 'src/app/services/configuration.service';
import * as ExcelJS from 'exceljs';
import { formatDate } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { UploadFileComponent } from './upload-file/upload-file.component';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.scss',
})
export class ConfigurationComponent implements OnInit {
  activeColor: Array<string> = [];

  public dataSource: any[] = [];
  public excelData: any[] = [];
  public headers: string[] = [];
  public configurations: Categories[] = [];
  private configurationData!: Configuration;
  public searchText = '';
  public selectedNode: string | null = null;
  childrenAccessor = (node: Categories) => node.children ?? [];

  hasChild = (_: number, node: Categories) =>
    !!node.children && node.children.length > 0;

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly spinner: NgxSpinnerService,
    private readonly ngbModal: NgbModal
  ) {}

  ngOnInit(): void {
    this.spinner.show();
    this.configurationService.getConfiguration().subscribe((data) => {
      console.log(data);
      this.configurationData = data;
      const inventories: Categories[] = [];
      data.inventories.forEach((inventory) => {
        inventories.push({
          name: inventory.category,
          children: [
            {
              timestamp: formatDate(
                inventory.timestamp,
                'dd-MMM-YYYY',
                'en-US'
              ),
              name: inventory.name,
            },
          ],
        });
      });
      this.configurations.push({
        name: 'inventories',
        children: inventories,
      });
      console.log(this.configurations);
      this.dataSource = this.configurations;
      this.spinner.hide();
    });
  }
  // Limit the number of rows displayed
  get limitedExcelData() {
    const maxRows = 10; // Set the maximum number of rows to display
    return this.excelData.slice(0, maxRows);
  }

  onChangeFile(fileName: string) {
    this.selectedNode = fileName;
    const inventory = this.configurationData.inventories.find(
      (inventory) => inventory.name === fileName
    );
    console.log(inventory);

    if (inventory) {
      const fileInventoryURL = inventory.fileUrl.fileInventoryUrl;
      console.log(fileInventoryURL);
      this.fetchAndParseExcel(fileInventoryURL);
    }
  }
  fetchAndParseExcel(url: string) {
    this.showSpinner();
    this.excelData = [];
    this.headers = [];
    try {
      this.configurationService.getDatafromUrl(url).subscribe(
        async (blob) => {
          const arrayBuffer = await blob.arrayBuffer();
          console.log('ArrayBuffer:', arrayBuffer);

          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);

          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            throw new Error('Worksheet not found');
          }

          console.log('Workbook:', workbook);
          console.log('Worksheet:', worksheet);

          worksheet
            .getRow(1)
            .eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
              this.headers[colNumber - 1] =
                cell.value !== null
                  ? String(cell.value)
                  : `Column ${colNumber}`;
            });

          worksheet.eachRow((row: any, rowIndex: any) => {
            if (rowIndex === 1) return;
            const rowData: any = {};
            row.eachCell(
              { includeEmpty: true },
              (cell: any, colNumber: any) => {
                let cellValue = cell.value;
                if (cellValue === null) {
                  cellValue = 'New Value';
                  switch (typeof cellValue) {
                    case 'string':
                      cellValue = cellValue.trim();
                      break;
                    case 'number':
                      cellValue = Number(cellValue);
                      break;
                    case 'boolean':
                      cellValue = cellValue ? 'Yes' : 'No';
                      break;
                    default:
                      cellValue = String(cellValue);
                  }
                }
                rowData[this.headers[colNumber - 1]] = cellValue;
              }
            );
            this.excelData.push(rowData);
          });
        },
        (error) => {
          console.error('Error downloading file:', error);
        }
      );
    } catch (error) {
      console.error('Error fetching or parsing file:', error);
    } finally {
      this.hiddenSpinner();
    }
  }

  showSpinner() {
    this.spinner.show('configuration', {
      type: 'ball-beat',
      size: 'medium',
      bdColor: 'rgba(255,255,255, .8)',
      color: 'black',
      fullScreen: false,
    });
  }
  hiddenSpinner() {
    this.spinner.hide('configuration');
  }

  openUploadFile(category: string, name: string) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const _category = this.configurations.find((cat) => cat.name == category);
    const _name = _category?.children?.find((cat) => cat.name == name)?.name;
    if (_name) console.error('check before open modal', _category, _name);
    const dialogRef = this.ngbModal.open(UploadFileComponent, {
      centered: true,
      animation: true,
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      beforeDismiss: () => {
        return false;
      },
    });

    dialogRef.componentInstance.name = _name;

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.showSpinner();
        }
      })
      .catch((error) => {
        console.error('Dialog was dismissed:', error);
      });
  }
}
