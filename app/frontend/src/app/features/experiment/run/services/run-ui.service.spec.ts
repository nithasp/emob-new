import { TestBed } from '@angular/core/testing';
import { NgxSpinnerService } from 'ngx-spinner';
import { RunUiService } from './run-ui.service';
import { configureRunPage } from '../testing/run-page.testing';

describe('RunUiService', () => {
  let ui: RunUiService;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;

  beforeEach(async () => {
    ({ spinnerSpy } = await configureRunPage());
    ui = TestBed.inject(RunUiService);
  });

  it('should create', () => {
    expect(ui).toBeTruthy();
  });

  describe('showSpinner() / hiddenSpinner()', () => {
    it('show/hide the "run" named spinner', () => {
      ui.showSpinner();
      expect(spinnerSpy.show).toHaveBeenCalledWith('run', jasmine.any(Object));
      ui.hiddenSpinner();
      expect(spinnerSpy.hide).toHaveBeenCalledWith('run');
    });
  });
});
