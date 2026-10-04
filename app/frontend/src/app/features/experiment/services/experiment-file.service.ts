import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigurationService } from '@features/configurations/services/configuration.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class ExperimentFileService {
  private readonly logger = inject(LoggerService);

  constructor(private readonly configurationService: ConfigurationService) {}

  async fetchDataFromFileUrl(url: string) {
    const blob = await firstValueFrom(
      this.configurationService.getDatafromUrl(url),
    );
    const arrayBuffer = await blob.arrayBuffer();
    return arrayBuffer;
  }

  async dataFromFileUrlToJson(url: string) {
    this.logger.log(`Fetching data from url: ${url}`);
    const arrayBuffer = await this.fetchDataFromFileUrl(url);
    this.logger.log(`Fetched array buffer with length: ${arrayBuffer.byteLength}`);
    const text = new TextDecoder().decode(arrayBuffer);
    const jsonData = JSON.parse(text);

    return jsonData;
  }
}
