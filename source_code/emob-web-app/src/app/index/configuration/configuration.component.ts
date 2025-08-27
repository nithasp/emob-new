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

  mockData: any = {
    configurations: [
      {
        companyName: 'COMTAN',
        id: '0198a798-0311-71d8-a86a-c566379200f4',
        timestamp: '2025-08-20T07:19:36.6603778Z',
        name: 'groupZone.xlsx',
        category: 'groupZone',
        type: 'groupZone',
        depotId: '0198a788-b237-716c-9e46-71540108e085',
        fileBlobPath:
          'COMTAN/configuration/0198a788-b237-716c-9e46-71540108e085/groupZone_groupZone.xlsx',
        columns: [
          'province_th',
          'province_en',
          'name_in_thai',
          'name_in_english',
          'zone_group',
        ],
        replace: true,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b237-716c-9e46-71540108e085',
          depotName: 'Depot 1 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '08:00',
          tw_late: '17:00',
          createdAt: '2025-08-14T07:43:30.359Z',
          updatedAt: '2025-08-14T07:43:36.1302597Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/configuration/0198a788-b237-716c-9e46-71540108e085/groupZone_groupZone.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DD1SORx7n5o7NcztNd3UrbKT7pn%252BIxXmb7I8aG2R40GI%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198a798-089a-77ba-9c63-941c774ca092',
        timestamp: '2025-08-19T08:53:56.2600354Z',
        name: 'groupZone.xlsx',
        category: 'groupZone',
        type: 'groupZone',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/configuration/0198a788-b775-7758-8759-00b75821756a/groupZone_groupZone.xlsx',
        columns: [
          'province_th',
          'province_en',
          'name_in_thai',
          'name_in_english',
          'zone_group',
        ],
        replace: true,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.2302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/configuration/0198a788-b775-7758-8759-00b75821756a/groupZone_groupZone.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DTiy3j3ApebLGz5GXOsdJkSl3OCkpS3hob0ebuhKPbIo%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198a798-0900-710f-8f88-5d243c538c1b',
        timestamp: '2025-08-20T06:54:57.339228Z',
        name: 'productMat1.xlsx',
        category: 'inventory',
        type: 'productMat1',
        depotId: '0198a788-b237-716c-9e46-71540108e085',
        fileBlobPath:
          'COMTAN/configuration/0198a788-b237-716c-9e46-71540108e085/inventory_productMat1.xlsx',
        columns: [
          'Material',
          'Material Number',
          'หน่วยใหญ่\nQUANTITYMAIN\t',
          'หน่วยเล็ก\nQUANTITYMINOR',
          'Sale Unit',
          'InnerPack',
          'NET_VOLUME (KG) / Piece',
          'PROD_SIZE (g) /  Piece',
          'Length',
          'Width',
          'Height',
        ],
        replace: true,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b237-716c-9e46-71540108e085',
          depotName: 'Depot 1 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '08:00',
          tw_late: '17:00',
          createdAt: '2025-08-14T07:43:30.359Z',
          updatedAt: '2025-08-14T07:43:36.1302597Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/configuration/0198a788-b237-716c-9e46-71540108e085/inventory_productMat1.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DrSGZ3om6ivzhFkCDHv72faNS%252BajANg1Ors8oFbkF48Y%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198a798-097b-759b-9625-2f0c2b5c6ecf',
        timestamp: '2025-08-27T02:56:51.784498Z',
        name: 'productMat1.xlsx',
        category: 'inventory',
        type: 'productMat1',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/configuration/0198a788-b775-7758-8759-00b75821756a/productMat1.xlsx',
        columns: [
          'Material',
          'Material Number',
          'หน่วยใหญ่\nQUANTITYMAIN\t',
          'หน่วยเล็ก\nQUANTITYMINOR',
          'Sale Unit',
          'InnerPack',
          'NET_VOLUME (KG) / Piece',
          'PROD_SIZE (g) /  Piece',
          'Length',
          'Width',
          'Height',
        ],
        replace: true,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.2302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/configuration/0198a788-b775-7758-8759-00b75821756a/productMat1.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DYnJ074YxCGOcMQNoy2el1mO8U2XL%252FChsyCwlglJXo%252Bg%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198a798-09e0-73c3-a8a8-bf52d6f1d611',
        timestamp: '2025-08-20T07:19:43.502453Z',
        name: 'productMat7.xlsx',
        category: 'inventory',
        type: 'productMat7',
        depotId: '0198a788-b237-716c-9e46-71540108e085',
        fileBlobPath:
          'COMTAN/configuration/0198a788-b237-716c-9e46-71540108e085/inventory_productMat7.xlsx',
        columns: [
          'ลำดับ',
          'Product ID',
          'รายการสินค้า',
          'กว้าง / Cm.',
          'ยาว / Cm.',
          'สูง / Cm.',
          'หนัก / Kg.',
        ],
        replace: true,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b237-716c-9e46-71540108e085',
          depotName: 'Depot 1 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '08:00',
          tw_late: '17:00',
          createdAt: '2025-08-14T07:43:30.359Z',
          updatedAt: '2025-08-14T07:43:36.1302597Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/configuration/0198a788-b237-716c-9e46-71540108e085/inventory_productMat7.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DFNezeoqDQd4wrkIbbvliiDRpBpDH%252BlIZj2Zmtbw5Ql0%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198a798-0a46-75ff-85f0-1739f36deabc',
        timestamp: '2025-08-20T06:55:51.3102637Z',
        name: 'productMat7.xlsx',
        category: 'inventory',
        type: 'productMat7',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/configuration/0198a788-b775-7758-8759-00b75821756a/inventory_productMat7.xlsx',
        columns: [
          'ลำดับ',
          'Product ID',
          'รายการสินค้า',
          'กว้าง / Cm.',
          'ยาว / Cm.',
          'สูง / Cm.',
          'หนัก / Kg.',
        ],
        replace: true,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.2302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/configuration/0198a788-b775-7758-8759-00b75821756a/inventory_productMat7.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DbVC3a0OFv2EmB0g2Pk8l7%252Bnpq6MNR9vTRahRPwHYMyc%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198e2ec-4420-76bc-b453-f3f6c05a4ecd',
        timestamp: '2025-08-25T20:29:56.1012528Z',
        name: 'Location.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b237-716c-9e46-71540108e085',
        fileBlobPath: '',
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b237-716c-9e46-71540108e085',
          depotName: 'Depot 1 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '08:00',
          tw_late: '17:00',
          createdAt: '2025-08-14T07:43:30.359Z',
          updatedAt: '2025-08-14T07:43:36.1302597Z',
        },
        fileUrl: {
          fileConfigurationUrl: null,
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198e2ec-4471-703b-919e-9b1c6b50f07e',
        timestamp: '2025-08-25T20:29:56.1812057Z',
        name: 'Location.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath: '',
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.2302034Z',
        },
        fileUrl: {
          fileConfigurationUrl: null,
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198e304-42db-70bd-a2b1-4982f807e6b1',
        timestamp: '2025-08-25T20:56:08.6864852Z',
        name: 'actual_location_2025-08-26T03:56:01.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b237-716c-9e46-71540108e085',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b237-716c-9e46-71540108e085/2025/08/actual_location_2025-08-26T03:56:01.xlsx',
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b237-716c-9e46-71540108e085',
          depotName: 'Depot 1 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '08:00',
          tw_late: '17:00',
          createdAt: '2025-08-14T07:43:30.359Z',
          updatedAt: '2025-08-14T07:43:36.1302597Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b237-716c-9e46-71540108e085/2025/08/actual_location_2025-08-26T03:56:01.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DbHd1Ab2ejgJ6VLlU7otBl1Zr5p21ABKCD8gxHDoPGC8%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198e4b8-b6bd-75d3-8624-ea94be9127c1',
        timestamp: '2025-08-26T04:52:47.4793047Z',
        name: 'actual_location_2025-08-26T11:52:45.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/08/actual_location_2025-08-26T11:52:45.xlsx',
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.2302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/08/actual_location_2025-08-26T11:52:45.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DY4Agj%252FvwYDtR8Mz4xSIon191nwIRUb%252Fu%252FLNm7gz2Ohw%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198e4b9-1c12-7173-bfde-5b8acc3fc9b5',
        timestamp: '2025-08-26T04:53:13.4087015Z',
        name: 'actual_location_2025-08-26T11:53:13.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/08/actual_location_2025-08-26T11:53:13.xlsx',
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.2302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/08/actual_location_2025-08-26T11:53:13.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DGYpPdnkvEaYVdf%252BJwfnL%252BQy5qA13f5s2wEDvwAz%252B6AA%253D',
        },
      },
      {
        companyName: 'COMTAN',
        id: '0198e4b9-1c12-7173-bfde-5b8acc3fc9b6', // Fixed: Unique ID
        timestamp: '2025-05-15T04:53:13.4087015Z',
        name: 'actual_location_2025-05-15T11:22:22.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-15T11:22:22.xlsx', // Fixed: Correct month path
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.2302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-15T11:22:22.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26sktid%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DGYpPdnkvEaYVdf%252BJwfnL%252BQy5qA13f5s2wEDvwAz%252B6AA%253D',
        },
      },

      {
        companyName: 'COMTAN',
        id: '0198e4b9-1c12-7173-bfde-5b8acc3fc9b7', // Fixed: Unique ID
        timestamp: '2025-12-10T04:53:13.4087015Z',
        name: 'actual_location_2025-12-10T21:22:22.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-10T21:22:22.xlsx', // Fixed: Correct month path
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.1302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-10T21:22:22.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26sktid%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DGYpPdnkvEaYVdf%252BJwfnL%252BQy5qA13f5s2wEDvwAz%252B6AA%253D',
        },
      },

      {
        companyName: 'COMTAN',
        id: '0198e4b9-1c12-7173-bfde-5b8acc3fc9b7', // Fixed: Unique ID
        timestamp: '2024-02-10T04:53:13.4087015Z',
        name: 'actual_location_2024-02-10T21:22:22.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-10T21:22:22.xlsx', // Fixed: Correct month path
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.1302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-10T21:22:22.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26sktid%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DGYpPdnkvEaYVdf%252BJwfnL%252BQy5qA13f5s2wEDvwAz%252B6AA%253D',
        },
      },

      {
        companyName: 'COMTAN',
        id: '0198e4b9-1c12-7173-bfde-5b8acc3fc9b7', // Fixed: Unique ID
        timestamp: '2024-07-10T04:53:13.4087015Z',
        name: 'actual_location_2024-02-10T21:22:22.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b775-7758-8759-00b75821756a',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-10T21:22:22.xlsx', // Fixed: Correct month path
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b775-7758-8759-00b75821756a',
          depotName: 'Depot 2 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '09:00',
          tw_late: '18:00',
          createdAt: '2025-08-14T07:43:31.701Z',
          updatedAt: '2025-08-14T07:43:36.1302034Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b775-7758-8759-00b75821756a/2025/05/actual_location_2025-05-10T21:22:22.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26sktid%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DGYpPdnkvEaYVdf%252BJwfnL%252BQy5qA13f5s2wEDvwAz%252B6AA%253D',
        },
      },

      {
        companyName: 'COMTAN',
        id: '0198e304-42db-70bd-a2b1-4982f807e6b1',
        timestamp: '2025-06-25T20:56:08.6864852Z',
        name: 'actual_location_2025-08-26T03:56:01.xlsx',
        category: 'actual',
        type: 'location',
        depotId: '0198a788-b237-716c-9e46-71540108e085',
        fileBlobPath:
          'COMTAN/actualLocation/0198a788-b237-716c-9e46-71540108e085/2025/08/actual_location_2025-08-26T03:56:01.xlsx',
        columns: [],
        replace: false,
        depot: {
          companyName: 'COMTAN',
          depotId: '0198a788-b237-716c-9e46-71540108e085',
          depotName: 'Depot 1 Input',
          latitude: 13.7563,
          longitude: 100.5018,
          tw_early: '08:00',
          tw_late: '17:00',
          createdAt: '2025-08-14T07:43:30.359Z',
          updatedAt: '2025-08-14T07:43:36.1302597Z',
        },
        fileUrl: {
          fileConfigurationUrl:
            '/api/v1/service/download-file?location=backend/COMTAN/actualLocation/0198a788-b237-716c-9e46-71540108e085/2025/08/actual_location_2025-08-26T03:56:01.xlsx&companyName=COMTAN&sasToken=sv%3D2025-01-05%26st%3D2025-08-27T02%253A58%253A26Z%26se%3D2025-08-28T02%253A58%253A26Z%26skoid%3D91a81a42-6eb5-476b-921c-cf92b4ed7492%26sktid%3Dbbb8da8f-f374-490f-9190-2242176e117c%26skt%3D2025-08-27T02%253A58%253A26Z%26ske%3D2025-08-28T02%253A58%253A26Z%26sks%3Db%26skv%3D2025-01-05%26sr%3Db%26sp%3Dr%26sig%3DbHd1Ab2ejgJ6VLlU7otBl1Zr5p21ABKCD8gxHDoPGC8%253D',
        },
      },
    ],
  };

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
      const depotMap = new Map<string, ConfigurationExplorerDepot>();

      data.configurations.forEach((configuration) => {
        const depotId = configuration.depotId;
        const depotName = configuration.depot?.depotName;
        const category = configuration.category;
        const type = 'configuration';

        if (!depotMap.has(depotId)) {
          depotMap.set(depotId, {
            depotId,
            depotName,
            fileType: [],
          });
        }

        const depot = depotMap.get(depotId)!;
        let categoryObj = depot.fileType.find(
          (ft: ConfigurationExplorerFileType) => ft.category === category
        );

        if (!categoryObj) {
          categoryObj = {
            category,
            type: category === 'actual' ? 'actual' : 'regular',
            children: [],
          };
          depot.fileType.push(categoryObj);
        }

        // Handle actual category differently - group by year and month
        if (category === 'actual') {
          this.addActualLocationToTree(categoryObj, configuration);
        } else {
          // Handle other categories normally
          (
            categoryObj.children as ConfigurationExplorerFileTypeChildren[]
          ).push({
            name: configuration.name,
            timestamp: formatDate(
              configuration.timestamp,
              'dd-MMM-YYYY HH:mm:ss',
              'en-US'
            ),
            type,
            depotId,
          });
        }
      });

      this.configurationsExplorer = Array.from(depotMap.values());
      this.dataSource = this.configurationsExplorer;
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
}
