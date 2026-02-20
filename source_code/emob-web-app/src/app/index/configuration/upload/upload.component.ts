import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  ActualLocation,
  Categories,
  Configuration,
} from 'src/app/models/configuration.model';
import { ConfigurationService } from 'src/app/services/configuration.service';
import * as ExcelJS from 'exceljs';
import { formatDate } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { UploadFileComponent } from '../upload-file/upload-file.component';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent implements OnInit {
  //Categories
  public selectedNode: string | null = null;
  public configurationsExplorer: Categories[] = [];
  public readonly configurationAllData: {
    configurations: Configuration[];
    actualLocations: ActualLocation[];
  } = { configurations: [], actualLocations: [] };
  activeColor: Array<string> = [];

  // NgbTable
  currentPage = 1; // Current page
  pageSize = 60;
  public dataSource: any[] = [];
  public excelData: any[] = [];
  public headers: string[] = [];
  public searchText = '';
  childrenAccessor = (node: Categories) => node.children ?? [];

  hasChild = (_: number, node: Categories) =>
    !!node.children && node.children.length > 0;

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly spinner: NgxSpinnerService,
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadDataConfiguration();
  }

  // Limit the number of rows displayed
  private loadDataConfiguration() {
    this.spinner.show();
    this.configurationService.getConfigurations().subscribe((data) => {
      this.configurationAllData.configurations = data.configurations;
      this.configurationAllData.actualLocations = data.actualLocations;
      const configurationCategory: Categories[] = [];
      // map data to tree structure
      data.configurations.forEach((configuration) => {
        const category = configurationCategory.find(
          (item) => item.name === configuration.category
        );
        if (category) {
          configurationCategory
            .find((item) => item.name === configuration.category)
            ?.children?.push({
              name: configuration.name,
              timestamp: formatDate(
                configuration.timestamp,
                'dd-MMM-YYYY HH:mm:ss',
                'en-US'
              ),
              type: 'configuration',
            });
        } else {
          configurationCategory.push({
            name: configuration.category,
            children: [
              {
                timestamp: formatDate(
                  configuration.timestamp,
                  'dd-MMM-YYYY HH:mm:ss',
                  'en-US'
                ),
                name: configuration.name,
                type: 'configuration',
              },
            ],
          });
        }
      });
      const actualLocationList: Categories[] = [];
      data.actualLocations.forEach((location) => {
        actualLocationList.push({
          name: location.year,
          children: location.children.map((child) => ({
            name: child.month,
            children: child.children.map((grandChild) => ({
              name: grandChild.fileName,
              blobPath: grandChild.fileBlobPath,
              timestamp: formatDate(
                grandChild.timestamp,
                'dd-MMM-YYYY HH:mm:ss',
                'en-US'
              ),
              type: 'actualLocation',
            })),
          })),
        });
      });
      configurationCategory.push({
        name: 'actualLocation',
        children: actualLocationList,
      });
      this.configurationsExplorer = configurationCategory;
      console.log(this.configurationsExplorer);
      this.dataSource = this.configurationsExplorer.filter(
        (item) => item.name !== 'actualLocation'
      );
      this.spinner.hide();
    });
  }
  get limitedExcelData() {
    const maxRows = 10; // Set the maximum number of rows to display
    return this.excelData.slice(0, maxRows);
  }

  onChangeFile(fileName: string, type: string, blobPath: string) {
    console.log(fileName, type, blobPath);
    this.showSpinner();
    try {
      this.selectedNode = fileName;
      if (type === 'actualLocation') {
        if (blobPath)
          this.configurationService
            .getActualLocation(blobPath)
            .subscribe((data) => {
              console.log(data);
              this.fetchAndParseExcel(
                data.children[0].children[0].fileUrl.fileActualLocationUrl
              );
              this.hiddenSpinner();
            });
      } else if (type === 'configuration') {
        const configuration = this.configurationAllData.configurations.find(
          (configuration) => configuration.name === fileName
        );
        console.log(configuration);

        if (configuration) {
          this.configurationService
            .getConfiguration(configuration.id)
            .subscribe(async (data) => {
              console.log(data);
              await this.fetchAndParseExcel(data.fileUrl.fileConfigurationUrl);
            });
        }
      }
    } catch (error) {
      console.error(error);
      this.hiddenSpinner();
    }

    this.currentPage = 1;
    this.searchText = '';
  }

  get paginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.excelData.slice(start, end);
  }

  async fetchAndParseExcel(url: string): Promise<void> {
    this.excelData = [];
    this.headers = [];
    try {
      const blob = await firstValueFrom(
        this.configurationService.getDatafromUrl(url)
      );
      const arrayBuffer = await blob.arrayBuffer();
      console.log('ArrayBuffer:', arrayBuffer);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('Worksheet not found');
      } else this.hiddenSpinner();

      worksheet
        .getRow(1)
        .eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
          this.headers[colNumber - 1] =
            cell.value !== null ? String(cell.value) : `Column ${colNumber}`;
        });

      worksheet.eachRow((row: any, rowIndex: any) => {
        if (rowIndex === 1) return;
        const rowData: any = {};
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
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
        });
        this.excelData.push(rowData);
      });
    } catch (error) {
      console.error('Error fetching or parsing file:', error);
    }
  }

  showSpinner() {
    this.spinner.show('configuration', {
      type: 'ball-beat',
      size: 'medium',
      bdColor: 'rgba(255,255,255, .9)',
      color: 'black',
      fullScreen: false,
    });
  }
  hiddenSpinner() {
    setTimeout(() => {
      this.spinner.hide('configuration');
    }, 500);
  }

  openUploadFile(category: string, name: string, type: string) {
    console.log('openUploadFile', category, name, type);
    console.log('name', name);

    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }

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

    dialogRef.componentInstance.category = category;
    dialogRef.componentInstance.type = type;
    dialogRef.componentInstance.name = name;
    if (type === 'configuration') {
      const cfg: any = this.configurationAllData.configurations.find(
        (c) => c.name === name
      );
      dialogRef.componentInstance.headersColumns = cfg?.columns ?? [];
    }

    dialogRef.result
      .then((file: File) => {
        if (file) {
          this.uploadFile(category, name, type, file);
        }
      })
      .catch((error) => {
        console.error('Dialog was dismissed:', error);
      });
  }
  uploadFile(category: string, name: string, type: string, file: File) {
    console.log(category, name, type, file);
    this.showSpinner();
    if (type === 'actualLocation') {
      this.configurationService
        .uploadActualLocation(file)
        .subscribe((response) => {
          console.log(response);
          this.loadDataConfiguration();
          this.toastr.success(
            this.transloco.translate('file_uploaded_successfully', {}, 'index'),
            'Actual Location'
          );
          this.hiddenSpinner();
        });
    } else if (type === 'configuration') {
      const configuration = this.configurationAllData.configurations.find(
        (cat) => cat.name == name
      );
      console.info('check before upload', configuration);
      if (configuration) {
        this.configurationService
          .uploadConfiguration(file, configuration.id)
          .subscribe((response) => {
            console.log(response);
            this.loadDataConfiguration();
            this.toastr.success(
              this.transloco.translate(
                'file_uploaded_successfully',
                {},
                'index'
              ),
              configuration.category
            );
            this.hiddenSpinner();
          });
      }
    }
  }
  downloadFile(url: string) {
    this.spinner.show();
    this.configurationService.downloadFile(url).subscribe((response) => {
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'downloadedFile';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches.length > 0) {
          fileName = matches[1];
        }
      }

      const blob = response.body;
      if (blob) {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.target = '_blank'; // Open in a new window
        link.click();
        this.spinner.hide();
        this.toastr.success(
          this.transloco.translate('success_to_download_plan', {}, 'index'),
          this.transloco.translate('download_plan', {}, 'index')
        );
        window.URL.revokeObjectURL(link.href); // Clean up
      } else {
        console.error('Download failed: Blob is null');
        this.spinner.hide();
      }
    });
  }

  getFileUrl(fileName: string, type: string, blobPath: string) {
    this.spinner.show();
    if (type === 'actualLocation') {
      if (blobPath)
        this.configurationService
          .getActualLocation(blobPath)
          .subscribe((data) => {
            console.log(data);
            this.downloadFile(
              data.children[0].children[0].fileUrl.fileActualLocationUrl
            );
          });
    } else if (type === 'configuration') {
      const configuration = this.configurationAllData.configurations.find(
        (configuration) => configuration.name === fileName
      );
      console.log(configuration);

      if (configuration) {
        this.configurationService
          .getConfiguration(configuration.id)
          .subscribe(async (data) => {
            console.log(data);
            this.downloadFile(data.fileUrl.fileConfigurationUrl);
          });
      }
    }
  }
}
