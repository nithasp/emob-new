import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { IndexComponent } from './index.component';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../models/auth.model';

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'jane',
    firstName: 'Jane',
    lastName: 'Doe',
    name: 'Jane Doe',
    role: 'BRS',
    roles: ['BRS'],
    companyName: 'Acme',
    ...overrides,
  };
}

describe('IndexComponent', () => {
  let component: IndexComponent;
  let fixture: ComponentFixture<IndexComponent>;
  let currentUser$: BehaviorSubject<AuthUser | null>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    currentUser$ = new BehaviorSubject<AuthUser | null>(user());
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [IndexComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser$: currentUser$.asObservable(),
            getCurrentUser: () => currentUser$.getValue(),
          },
        },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(IndexComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() populates userProfile from the signed-in user', () => {
    fixture.detectChanges();

    expect(component.userProfile).toEqual({
      name: 'Jane Doe',
      username: 'jane',
      companyName: 'Acme',
    });
  });

  it('setLoginDisplay() falls back to nulls when nobody is signed in', () => {
    fixture.detectChanges();

    component.setLoginDisplay(null);

    expect(component.userProfile).toEqual({ name: null, username: null, companyName: null });
  });

  it('refreshes the profile when the signed-in user changes', () => {
    fixture.detectChanges();

    currentUser$.next(user({ name: 'Refreshed' }));

    expect(component.userProfile.name).toBe('Refreshed');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('goes to the login page when the session ends', () => {
    fixture.detectChanges();

    currentUser$.next(null);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('stops reacting after ngOnDestroy()', () => {
    fixture.detectChanges();

    component.ngOnDestroy();
    currentUser$.next(null);

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
