import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  MSAL_GUARD_CONFIG,
  MsalBroadcastService,
  MsalGuardConfiguration,
  MsalService,
} from '@azure/msal-angular';
import { InteractionStatus, InteractionType } from '@azure/msal-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  let authService: jasmine.SpyObj<MsalService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<MsalService>(
      'MsalService',
      ['initialize'],
      {
        instance: jasmine.createSpyObj('PublicClientApplication', [
          'enableAccountStorageEvents',
          'getAllAccounts',
          'getActiveAccount',
          'setActiveAccount',
        ]),
      }
    );
    authService.initialize.and.returnValue(of(undefined));
    (authService.instance.getAllAccounts as jasmine.Spy).and.returnValue([]);
    (authService.instance.getActiveAccount as jasmine.Spy).and.returnValue(
      null
    );

    const msalBroadcastService = {
      msalSubject$: of(),
      inProgress$: of(InteractionStatus.None),
    };

    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        {
          provide: MSAL_GUARD_CONFIG,
          useValue: {
            interactionType: InteractionType.Redirect,
          } as MsalGuardConfiguration,
        },
        { provide: MsalService, useValue: authService },
        { provide: MsalBroadcastService, useValue: msalBroadcastService },
        { provide: Router, useValue: router },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Replace the template so we don't pull in ngx-spinner / mat-icon
      // dependencies that aren't registered in this testing module.
      .overrideComponent(AppComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });
});
