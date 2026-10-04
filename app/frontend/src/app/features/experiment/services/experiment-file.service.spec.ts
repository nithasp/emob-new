import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfigurationService } from '@features/configurations/services/configuration.service';
import { ExperimentFileService } from './experiment-file.service';

describe('ExperimentFileService', () => {
  let service: ExperimentFileService;
  let configurationServiceSpy: jasmine.SpyObj<ConfigurationService>;

  beforeEach(() => {
    configurationServiceSpy = jasmine.createSpyObj<ConfigurationService>(
      'ConfigurationService',
      ['getDatafromUrl'],
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigurationService, useValue: configurationServiceSpy },
      ],
    });
    service = TestBed.inject(ExperimentFileService);
  });

  describe('fetchDataFromFileUrl() / dataFromFileUrlToJson()', () => {
    it('fetches a blob and parses it as JSON', async () => {
      const blob = new Blob([JSON.stringify({ foo: 'bar' })], {
        type: 'application/json',
      });
      configurationServiceSpy.getDatafromUrl.and.returnValue(of(blob));

      const result = await service.dataFromFileUrlToJson(
        'https://example.com/data.json'
      );

      expect(result).toEqual({ foo: 'bar' });
    });
  });
});
