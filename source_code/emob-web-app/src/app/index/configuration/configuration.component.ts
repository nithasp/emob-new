import { Component, OnInit, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  ActualLocation,
  Categories,
  Configuration,
  ConfigurationExplorerDepot,
  ConfigurationExplorerFileType,
  ConfigurationExplorerFileTypeChildren,
  ConfigurationExplorerYearNode,
  ConfigurationExplorerMonthNode,
  ExplorerNode,
  ExcelRow,
  ConfigurationComponentData,
  FileType,
} from 'src/app/models/configuration.model';
import { ConfigurationService } from 'src/app/services/configuration.service';
import * as ExcelJS from 'exceljs';
import { formatDate } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { UploadFileComponent } from './upload-file/upload-file.component';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.scss',
})
export class ConfigurationComponent implements OnInit {
  readonly panelOpenState = signal<boolean>(false);
  //Categories
  public selectedNode: string | null = null;
  public configurationsExplorer: ConfigurationExplorerDepot[] = [];
  public readonly configurationAllData: ConfigurationComponentData = {
    configurations: [],
    actualLocations: [],
  };
  activeColor: string[] = [];

  // NgbTable
  currentPage = 1; // Current page
  pageSize = 60;
  public dataSource: ConfigurationExplorerDepot[] = [];
  public excelData: ExcelRow[] = [];
  public headers: string[] = [];
  public searchText = '';

  childrenAccessor = (
    node: ExplorerNode
  ):
    | ConfigurationExplorerFileType[]
    | ConfigurationExplorerFileTypeChildren[]
    | ConfigurationExplorerYearNode[]
    | ConfigurationExplorerMonthNode[]
    | [] => {
    if ('fileType' in node) {
      return node.fileType;
    }
    if ('children' in node) {
      // Check if this is a fileType node with actual category
      if ('type' in node && node.type === 'actual') {
        return node.children as ConfigurationExplorerYearNode[];
      }
      // Check if this is a year node
      if ('year' in node) {
        return node.children as ConfigurationExplorerMonthNode[];
      }
      // Check if this is a month node
      if ('month' in node) {
        return node.children as ConfigurationExplorerFileTypeChildren[];
      }
      // Default case for regular categories
      return node.children as ConfigurationExplorerFileTypeChildren[];
    }
    return [];
  };

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

  //Limit the number of rows displayed
  private loadDataConfiguration() {
    this.spinner.show();
    this.configurationService.getConfigurations().subscribe((data) => {
      console.log('data', data);

      this.configurationAllData.configurations = data.configurations;
      
      // Create two separate data structures:
      // 1. configurationsExplorer - for mat-tree-top-right (dropdown) - shows all configurations
      // 2. dataSource - for mat-tree-left (tree) - only shows configurations with fileBlobPath
      
      const depotMapForDropdown = new Map<string, ConfigurationExplorerDepot>();
      const depotMapForTree = new Map<string, ConfigurationExplorerDepot>();

      data.configurations.forEach((configuration) => {
        const depotId = configuration.depotId;
        const depotName = configuration.depot?.depotName;
        const category = configuration.category;
        const type = 'configuration';

        // Process for dropdown (reversed logic for actual category)
        if (category === 'actual') {
          // For actual category: only show items where fileBlobPath is EMPTY
          if (!configuration.fileBlobPath || configuration.fileBlobPath.trim() === '') {
            if (!depotMapForDropdown.has(depotId)) {
              depotMapForDropdown.set(depotId, {
                depotId,
                depotName,
                fileType: [],
              });
            }

            const depotForDropdown = depotMapForDropdown.get(depotId)!;
            let categoryObjForDropdown = depotForDropdown.fileType.find(
              (ft: ConfigurationExplorerFileType) => ft.category === category
            );

            if (!categoryObjForDropdown) {
              categoryObjForDropdown = {
                category,
                type: 'actual',
                children: [],
              };
              depotForDropdown.fileType.push(categoryObjForDropdown);
            }

            this.addActualLocationToTree(categoryObjForDropdown, configuration);
          }
        } else {
          // For other categories: show all items (keep current logic)
          if (!depotMapForDropdown.has(depotId)) {
            depotMapForDropdown.set(depotId, {
              depotId,
              depotName,
              fileType: [],
            });
          }

          const depotForDropdown = depotMapForDropdown.get(depotId)!;
          let categoryObjForDropdown = depotForDropdown.fileType.find(
            (ft: ConfigurationExplorerFileType) => ft.category === category
          );

          if (!categoryObjForDropdown) {
            categoryObjForDropdown = {
              category,
              type: 'regular',
              children: [],
            };
            depotForDropdown.fileType.push(categoryObjForDropdown);
          }

          // Handle other categories normally
          (
            categoryObjForDropdown.children as ConfigurationExplorerFileTypeChildren[]
          ).push({
            name: configuration.name,
            timestamp: formatDate(
              configuration.timestamp,
              'dd-MMM-YYYY HH:mm:ss',
              'en-US'
            ),
            type,
            depotId,
            blobPath: configuration.fileBlobPath,
          });
        }

        // Process for tree (only configurations with fileBlobPath)
        if (configuration.fileBlobPath && configuration.fileBlobPath.trim() !== '') {
          if (!depotMapForTree.has(depotId)) {
            depotMapForTree.set(depotId, {
              depotId,
              depotName,
              fileType: [],
            });
          }

          const depotForTree = depotMapForTree.get(depotId)!;
          let categoryObjForTree = depotForTree.fileType.find(
            (ft: ConfigurationExplorerFileType) => ft.category === category
          );

          if (!categoryObjForTree) {
            categoryObjForTree = {
              category,
              type: category === 'actual' ? 'actual' : 'regular',
              children: [],
            };
            depotForTree.fileType.push(categoryObjForTree);
          }

          // Handle actual category differently - group by year and month
          if (category === 'actual') {
            this.addActualLocationToTree(categoryObjForTree, configuration);
          } else {
            // Handle other categories normally
            (
              categoryObjForTree.children as ConfigurationExplorerFileTypeChildren[]
            ).push({
              name: configuration.name,
              timestamp: formatDate(
                configuration.timestamp,
                'dd-MMM-YYYY HH:mm:ss',
                'en-US'
              ),
              type,
              depotId,
              blobPath: configuration.fileBlobPath,
            });
          }
        }
      });

      // Clean up empty categories and depots for dropdown
      this.configurationsExplorer = Array.from(depotMapForDropdown.values())
        .map(depot => ({
          ...depot,
          fileType: depot.fileType.filter(category => {
            if (category.type === 'actual') {
              // For actual categories, check if there are any files in year/month nodes
              const yearNodes = category.children as ConfigurationExplorerYearNode[];
              return yearNodes.some(yearNode => 
                yearNode.children.some(monthNode => monthNode.children.length > 0)
              );
            } else {
              // For regular categories, check if there are any files
              const children = category.children as ConfigurationExplorerFileTypeChildren[];
              return children.length > 0;
            }
          })
        }))
        .filter(depot => depot.fileType.length > 0);

      // Clean up empty categories and depots for tree
      const treeData = Array.from(depotMapForTree.values())
        .map(depot => ({
          ...depot,
          fileType: depot.fileType.filter(category => {
            if (category.type === 'actual') {
              // For actual categories, check if there are any files in year/month nodes
              const yearNodes = category.children as ConfigurationExplorerYearNode[];
              return yearNodes.some(yearNode => 
                yearNode.children.some(monthNode => monthNode.children.length > 0)
              );
            } else {
              // For regular categories, check if there are any files
              const children = category.children as ConfigurationExplorerFileTypeChildren[];
              return children.length > 0;
            }
          })
        }))
        .filter(depot => depot.fileType.length > 0);

      // Set dataSource for tree (only configurations with fileBlobPath)
      this.dataSource = treeData;

      console.log('this.configurationsExplorer (dropdown):', this.configurationsExplorer);
      console.log('this.dataSource (tree):', this.dataSource);
      this.spinner.hide();
    });
  }

  // private loadDataConfiguration() {
  //   this.spinner.show();

  //   // Use mock data for testing instead of service call
  //   const data = this.mockData;
  //   console.log('Using mock data:', data);

  //   this.configurationAllData.configurations = data.configurations;
  //   const depotMap = new Map<string, ConfigurationExplorerDepot>();

  //   data.configurations.forEach((configuration: Configuration) => {
  //     const depotId = configuration.depotId;
  //     const depotName = configuration.depot?.depotName;
  //     const category = configuration.category;
  //     const type = 'configuration';

  //     if (!depotMap.has(depotId)) {
  //       depotMap.set(depotId, {
  //         depotId,
  //         depotName,
  //         fileType: [],
  //       });
  //     }

  //     const depot = depotMap.get(depotId)!;
  //     let categoryObj = depot.fileType.find(
  //       (ft: ConfigurationExplorerFileType) => ft.category === category
  //     );

  //     if (!categoryObj) {
  //       categoryObj = {
  //         category,
  //         type: category === 'actual' ? 'actual' : 'regular',
  //         children: [],
  //       };
  //       depot.fileType.push(categoryObj);
  //     }

  //     // Handle actual category differently - group by year and month
  //     if (category === 'actual') {
  //       this.addActualLocationToTree(categoryObj, configuration);
  //     } else {
  //       // Handle other categories normally
  //       (categoryObj.children as ConfigurationExplorerFileTypeChildren[]).push({
  //         name: configuration.name,
  //         timestamp: formatDate(
  //           configuration.timestamp,
  //           'dd-MMM-YYYY HH:mm:ss',
  //           'en-US'
  //         ),
  //         type,
  //         depotId,
  //       });
  //     }
  //   });

  //   this.configurationsExplorer = Array.from(depotMap.values());
  //   this.dataSource = this.configurationsExplorer;

  //   // Debug: Log the final tree structure
  //   console.log('Final tree structure:');
  //   this.configurationsExplorer.forEach((depot) => {
  //     console.log(`Depot: ${depot.depotName}`);
  //     depot.fileType.forEach((category) => {
  //       console.log(`  Category: ${category.category} (${category.type})`);
  //       if (category.type === 'actual') {
  //         const yearNodes =
  //           category.children as ConfigurationExplorerYearNode[];
  //         yearNodes.forEach((yearNode) => {
  //           console.log(`    Year: ${yearNode.year}`);
  //           yearNode.children.forEach((monthNode) => {
  //             console.log(
  //               `      Month: ${monthNode.month} (${monthNode.children.length} files)`
  //             );
  //             monthNode.children.forEach((file) => {
  //               console.log(`        File: ${file.name}`);
  //             });
  //           });
  //         });
  //       } else {
  //         const regularChildren =
  //           category.children as ConfigurationExplorerFileTypeChildren[];
  //         console.log(`    Regular files: ${regularChildren.length}`);
  //         regularChildren.forEach((file) => {
  //           console.log(`      File: ${file.name}`);
  //         });
  //       }
  //     });
  //   });

  //   this.spinner.hide();
  // }

  private addActualLocationToTree(
    categoryObj: ConfigurationExplorerFileType,
    configuration: Configuration
  ) {
    const timestamp = new Date(configuration.timestamp);
    const year = timestamp.getFullYear().toString();
    const monthNumber = timestamp.getMonth() + 1;
    const month = monthNumber.toString().padStart(2, '0');

    // Use month numbers (01-12) for display
    const monthDisplay = month; // 01, 02, 03, etc.

    console.log(`Processing actual location: ${configuration.name}`);
    console.log(`  Timestamp: ${configuration.timestamp}`);
    console.log(`  Year: ${year}, Month: ${month} (${monthDisplay})`);

    // Find or create year node
    let yearNode = (
      categoryObj.children as ConfigurationExplorerYearNode[]
    ).find((yn: ConfigurationExplorerYearNode) => yn.year === year);

    if (!yearNode) {
      yearNode = {
        year,
        children: [],
      };
      (categoryObj.children as ConfigurationExplorerYearNode[]).push(yearNode);
      console.log(`  Created new year node: ${year}`);

      // Sort years in chronological order (2024, 2025, etc.)
      (categoryObj.children as ConfigurationExplorerYearNode[]).sort((a, b) => {
        const yearA = parseInt(a.year);
        const yearB = parseInt(b.year);
        return yearA - yearB;
      });
    } else {
      console.log(`  Found existing year node: ${year}`);
    }

    // Find or create month node
    let monthNode = yearNode.children.find(
      (mn: ConfigurationExplorerMonthNode) => mn.month === monthDisplay
    );

    if (!monthNode) {
      monthNode = {
        month: monthDisplay, // Use month number (01, 02, etc.)
        children: [],
      };
      yearNode.children.push(monthNode);
      console.log(`  Created new month node: ${monthDisplay}`);

      // Sort months in chronological order (01, 02, 03, ..., 12)
      yearNode.children.sort((a, b) => {
        const monthA = parseInt(a.month);
        const monthB = parseInt(b.month);
        return monthA - monthB;
      });
    } else {
      console.log(`  Found existing month node: ${monthDisplay}`);
    }

    // Add the file to the month node
    monthNode.children.push({
      name: configuration.name,
      timestamp: formatDate(
        configuration.timestamp,
        'dd-MMM-YYYY HH:mm:ss',
        'en-US'
      ),
      type: 'actualLocation',
      depotId: configuration.depotId,
      blobPath: configuration.fileBlobPath,
    });

    console.log(`  Added file to month node: ${configuration.name}`);
    console.log(
      `  Current year node children count: ${yearNode.children.length}`
    );
    console.log(
      `  Current month node children count: ${monthNode.children.length}`
    );
  }
  get limitedExcelData() {
    const maxRows = 10; // Set the maximum number of rows to display
    return this.excelData.slice(0, maxRows);
  }

  onChangeFile(fileName: string, type: string, blobPath: string) {
    console.log(fileName, type, blobPath);
    
    // Check if blobPath is empty
    if (!blobPath || blobPath.trim() === '') {
      this.toastr.error(
        this.transloco.translate('error_no_file_path', {}, 'index') || 'No file path available',
        this.transloco.translate('error', {}, 'index') || 'Error'
      );
      return;
    }
    
    this.showSpinner();
    try {
      this.selectedNode = fileName;
      if (type === 'configuration' || type === 'actualLocation') {
        const configuration: Configuration | undefined =
          this.configurationAllData.configurations.find(
            (configuration) => configuration.name === fileName
          );

        if (configuration) {
          this.configurationService
            .getConfiguration(configuration.id)
            .subscribe(async (data) => {
              if (data.fileUrl?.fileConfigurationUrl) {
                await this.fetchAndParseExcel(
                  data.fileUrl.fileConfigurationUrl
                );
              } else {
                this.toastr.error(
                  this.transloco.translate(
                    'error_no_url_provided',
                    {},
                    'index'
                  ),
                  this.transloco.translate('error', {}, 'index')
                );
                this.hiddenSpinner();
              }
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
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('Worksheet not found');
      } else this.hiddenSpinner();

      worksheet
        .getRow(1)
        .eachCell(
          { includeEmpty: true },
          (cell: ExcelJS.Cell, colNumber: number) => {
            this.headers[colNumber - 1] =
              cell.value !== null ? String(cell.value) : `Column ${colNumber}`;
          }
        );

      worksheet.eachRow((row: ExcelJS.Row, rowIndex: number) => {
        if (rowIndex === 1) return;
        const rowData: ExcelRow = {};
        row.eachCell(
          { includeEmpty: true },
          (cell: ExcelJS.Cell, colNumber: number) => {
            let cellValue = cell.value;
            if (cellValue === null || cellValue === undefined) {
              cellValue = 'New Value';
            } else {
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

  openUploadFile(
    category: string,
    name: string,
    type: string,
    depotId: string
  ) {
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
    if (type === 'configuration' || type === 'actualLocation') {
      const cfg: Configuration | undefined =
        this.configurationAllData.configurations.find(
          (c) => c.name === name && c.depotId === depotId
        );
      dialogRef.componentInstance.headersColumns = cfg?.columns ?? [];
    }

    dialogRef.result
      .then((file: File) => {
        if (file) {
          this.uploadFile(category, name, type, file, depotId);
        }
      })
      .catch((error) => {
        console.error('Dialog was dismissed:', error);
      });
  }

  uploadFile(
    category: string,
    name: string,
    type: string,
    file: File,
    depotId: string
  ) {
    this.showSpinner();
    if (type === 'configuration' || type === 'actualLocation') {
      const configuration: Configuration | undefined =
        this.configurationAllData.configurations.find(
          (cat) => cat.name === name && cat.depotId === depotId
        );

      if (configuration) {
        this.configurationService
          .uploadConfiguration(file, configuration.id)
          .subscribe((response) => {
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
  downloadFile(url: string, hideSpinnerOnError: boolean = false) {
    console.log('url', url);

    if (!url || url.trim() === '') {
      this.toastr.error(
        this.transloco.translate('error_no_url_provided', {}, 'index'),
        this.transloco.translate('download_error', {}, 'index')
      );
      if (hideSpinnerOnError) {
        this.spinner.hide();
      }
      return;
    }

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
    console.log('fileName', fileName);
    console.log('type', type);
    console.log('blobPath', blobPath);

    // Check if blobPath is empty
    if (!blobPath || blobPath.trim() === '') {
      this.toastr.error(
        this.transloco.translate('error_no_file_path', {}, 'index') || 'No file path available',
        this.transloco.translate('error', {}, 'index') || 'Error'
      );
      return;
    }

    if (type === 'configuration' || type === 'actualLocation') {
      const configuration: Configuration | undefined =
        this.configurationAllData.configurations.find(
          (configuration) => configuration.name === fileName
        );

      if (configuration) {
        this.spinner.show();
        this.configurationService
          .getConfiguration(configuration.id)
          .subscribe(async (data) => {
            if (data.fileUrl?.fileConfigurationUrl) {
              this.downloadFile(data.fileUrl.fileConfigurationUrl, true);
            } else {
              this.toastr.error(
                this.transloco.translate('error_no_url_provided', {}, 'index'),
                this.transloco.translate('error', {}, 'index')
              );
              this.spinner.hide();
            }
          });
      } else {
        this.toastr.error(
          this.transloco.translate('configuration_not_found', {}, 'index'),
          this.transloco.translate('error', {}, 'index')
        );
      }
    }
  }

  isDepotNode(_: number, node: unknown): node is ConfigurationExplorerDepot {
    return (
      typeof node === 'object' &&
      node !== null &&
      Array.isArray((node as { fileType?: unknown }).fileType)
    );
  }

  isFileTypeNode(
    _: number,
    node: unknown
  ): node is ConfigurationExplorerFileType {
    return (
      typeof node === 'object' &&
      node !== null &&
      typeof (node as { category?: unknown }).category === 'string' &&
      typeof (node as { type?: unknown }).type === 'string' &&
      Array.isArray((node as { children?: unknown }).children)
    );
  }

  isChildNode(
    _: number,
    node: unknown
  ): node is ConfigurationExplorerFileTypeChildren {
    return (
      typeof node === 'object' &&
      node !== null &&
      typeof (node as { name?: unknown }).name === 'string' &&
      typeof (node as { type?: unknown }).type === 'string' &&
      !Array.isArray((node as { children?: unknown }).children) &&
      !Array.isArray((node as { fileType?: unknown }).fileType)
    );
  }

  isYearNode(_: number, node: unknown): node is ConfigurationExplorerYearNode {
    return (
      typeof node === 'object' &&
      node !== null &&
      typeof (node as { year?: unknown }).year === 'string' &&
      Array.isArray((node as { children?: unknown }).children) &&
      !Array.isArray((node as { fileType?: unknown }).fileType)
    );
  }

  isMonthNode(
    _: number,
    node: unknown
  ): node is ConfigurationExplorerMonthNode {
    return (
      typeof node === 'object' &&
      node !== null &&
      typeof (node as { month?: unknown }).month === 'string' &&
      Array.isArray((node as { children?: unknown }).children) &&
      !Array.isArray((node as { fileType?: unknown }).fileType)
    );
  }

  trackByDepotId(index: number, depot: ConfigurationExplorerDepot): string {
    return depot.depotId;
  }

  trackByFileType(
    index: number,
    fileType: ConfigurationExplorerFileType
  ): string {
    return fileType.category;
  }

  trackByYear(index: number, yearNode: ConfigurationExplorerYearNode): string {
    return yearNode.year;
  }

  trackByMonth(
    index: number,
    monthNode: ConfigurationExplorerMonthNode
  ): string {
    return monthNode.month;
  }

  // Helper methods to get children with proper typing
  getYearChildren(
    fileType: ConfigurationExplorerFileType
  ): ConfigurationExplorerYearNode[] {
    if (fileType.type === 'actual') {
      return fileType.children as ConfigurationExplorerYearNode[];
    }
    return [];
  }

  getRegularChildren(
    fileType: ConfigurationExplorerFileType
  ): ConfigurationExplorerFileTypeChildren[] {
    if (fileType.type === 'regular') {
      return fileType.children as ConfigurationExplorerFileTypeChildren[];
    }
    return [];
  }

  // Helper method to get flattened actual children without year/month hierarchy
  getFlattenedActualChildren(
    fileType: ConfigurationExplorerFileType
  ): ConfigurationExplorerFileTypeChildren[] {
    if (fileType.type === 'actual') {
      const yearNodes = fileType.children as ConfigurationExplorerYearNode[];
      const flattenedChildren: ConfigurationExplorerFileTypeChildren[] = [];
      
      yearNodes.forEach(yearNode => {
        yearNode.children.forEach(monthNode => {
          monthNode.children.forEach(child => {
            flattenedChildren.push(child);
          });
        });
      });
      
      return flattenedChildren;
    }
    return [];
  }
}
