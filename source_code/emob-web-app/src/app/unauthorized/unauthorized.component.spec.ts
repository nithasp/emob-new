import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  MSAL_GUARD_CONFIG,
  MsalBroadcastService,
  MsalGuardConfiguration,
  MsalService,
} from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';

import { UnauthorizedComponent } from './unauthorized.component';

describe('UnauthorizedComponent', () => {
  let component: UnauthorizedComponent;
  let fixture: ComponentFixture<UnauthorizedComponent>;

  let authService: jasmine.SpyObj<MsalService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<MsalService>(
      'MsalService',
      ['logoutPopup', 'logoutRedirect'],
      {
        instance: jasmine.createSpyObj('PublicClientApplication', [
          'getActiveAccount',
        ]),
      }
    );

    const msalBroadcastService = jasmine.createSpyObj<MsalBroadcastService>(
      'MsalBroadcastService',
      [],
      { inProgress$: undefined, msalSubject$: undefined }
    );

    await TestBed.configureTestingModule({
      declarations: [UnauthorizedComponent],
      providers: [
        {
          provide: MSAL_GUARD_CONFIG,
          useValue: {
            interactionType: InteractionType.Redirect,
          } as MsalGuardConfiguration,
        },
        { provide: MsalService, useValue: authService },
        { provide: MsalBroadcastService, useValue: msalBroadcastService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Replace the template so we don't pull in transloco pipes.
      .overrideComponent(UnauthorizedComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(UnauthorizedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
