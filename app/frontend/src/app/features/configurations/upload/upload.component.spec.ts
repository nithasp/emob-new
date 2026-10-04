import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

import { UploadComponent } from './upload.component';
import { ConfigurationService } from '../services/configuration.service';
import { Configuration } from '../models/configuration.model';
import { Response as GraphqlResponse } from '@core/models/graphql.model';

function createMockConfiguration(
  overrides: Partial<Configuration> = {}
): Configuration {
  return {
    companyName: 'ACME',
    id: 'config-1',
    timestamp: '2024-01-01T00:00:00Z',
    name: 'config.xlsx',
    category: 'demand',
    type: 'configuration',
    depotId: 'depot-1',
    fileBlobPath: '',
    columns: [],
    replace: false,
    depot: { depotName: 'Main Depot' } as unknown as Configuration['depot'],
    fileUrl: { fileConfigurationUrl: '' },
    ...overrides,
  };
}

describe('UploadComponent', () => {
  let component: UploadComponent;
  let fixture: ComponentFixture<UploadComponent>;

  let configurationService: jasmine.SpyObj<ConfigurationService>;
  let spinner: jasmine.SpyObj<NgxSpinnerService>;
  let ngbModal: jasmine.SpyObj<NgbModal>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    configurationService = jasmine.createSpyObj<ConfigurationService>(
      'ConfigurationService',
      [
        'getConfigurations',
        'getConfiguration',
        'getDatafromUrl',
        'uploadConfiguration',
        'downloadFile',
      ]
    );
    spinner = jasmine.createSpyObj<NgxSpinnerService>('NgxSpinnerService', [
      'show',
      'hide',
    ]);
    ngbModal = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    transloco = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
    ]);

    configurationService.getConfigurations.and.returnValue(
      of({ configurations: [] } as unknown as GraphqlResponse)
    );
    transloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      declarations: [UploadComponent],
      providers: [
        { provide: ConfigurationService, useValue: configurationService },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: NgbModal, useValue: ngbModal },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslocoService, useValue: transloco },
      ],
    })
      .overrideComponent(UploadComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(configurationService.getConfigurations).toHaveBeenCalled();
  });

  describe('ngOnInit / loadDataConfiguration', () => {
    it('should load configurations into configurationAllData', () => {
      const configuration = createMockConfiguration();
      configurationService.getConfigurations.and.returnValue(
        of({ configurations: [configuration] } as unknown as GraphqlResponse)
      );

      component.ngOnInit();

      expect(spinner.show).toHaveBeenCalled();
      expect(component.configurationAllData.configurations).toEqual([
        configuration,
      ]);
      expect(spinner.hide).toHaveBeenCalled();
    });
  });

  describe('node type guards', () => {
    it('should identify depot nodes', () => {
      expect(component.isDepotNode(0, { fileType: [] })).toBeTrue();
      expect(component.isDepotNode(0, { name: 'not-a-depot' })).toBeFalse();
    });

    it('should identify file type nodes', () => {
      expect(
        component.isFileTypeNode(0, {
          category: 'demand',
          type: 'regular',
          children: [],
        })
      ).toBeTrue();
      expect(component.isFileTypeNode(0, { fileType: [] })).toBeFalse();
    });

    it('should identify child nodes', () => {
      expect(
        component.isChildNode(0, { name: 'config.xlsx', type: 'configuration' })
      ).toBeTrue();
      expect(
        component.isChildNode(0, {
          name: 'demand',
          type: 'regular',
          children: [],
        })
      ).toBeFalse();
    });

    it('should identify year nodes', () => {
      expect(component.isYearNode(0, { year: '2024', children: [] })).toBeTrue();
      expect(component.isYearNode(0, { month: '01', children: [] })).toBeFalse();
    });

    it('should identify month nodes', () => {
      expect(
        component.isMonthNode(0, { month: '01', children: [] })
      ).toBeTrue();
      expect(
        component.isMonthNode(0, { year: '2024', children: [] })
      ).toBeFalse();
    });
  });

  describe('trackBy helpers', () => {
    it('should track nodes by their identifying field', () => {
      expect(
        component.trackByDepotId(0, {
          depotId: 'depot-1',
          depotName: 'Main Depot',
          fileType: [],
        })
      ).toBe('depot-1');
      expect(
        component.trackByFileType(0, {
          category: 'demand',
          type: 'regular',
          children: [],
        })
      ).toBe('demand');
    });
  });

  describe('paginated excel data', () => {
    it('should paginate the excel data by page size', () => {
      component.excelData = Array.from({ length: 5 }, (_, i) => ({ col: i }));
      component.pageSize = 2;
      component.currentPage = 2;

      expect(component.paginatedData).toEqual([{ col: 2 }, { col: 3 }]);
    });
  });

  describe('onChangeFileById', () => {
    it('should show an error and skip loading when the blob path is missing', () => {
      component.onChangeFileById('config-1', 'configuration', '');

      expect(toastr.error).toHaveBeenCalled();
      expect(configurationService.getConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('downloadFile', () => {
    it('should show an error and hide the spinner when the url is missing', () => {
      component.downloadFile('', true);

      expect(toastr.error).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
      expect(configurationService.downloadFile).not.toHaveBeenCalled();
    });
  });

  describe('getFileUrlById', () => {
    it('should show a not-found error when no configuration matches the id', () => {
      component.getFileUrlById('missing-id', 'configuration', 'some/path');

      expect(toastr.error).toHaveBeenCalledWith(
        'configuration_not_found',
        'error'
      );
      expect(configurationService.getConfiguration).not.toHaveBeenCalled();
    });
  });
});
