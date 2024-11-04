import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: "root"
})
export class roleGuardService implements CanActivate {
  constructor(
    private authService: AuthService,
    private userService : UserService,
    private router: Router
  ){}

  canActivate(route: ActivatedRouteSnapshot,state: RouterStateSnapshot): boolean {
    const expectedRole:[string] = route.data['expectedRole'];  
    if(!this.authService.isAuthenticated()||
    !expectedRole.includes(this.userService.role)
    ){
      this.router.navigate(['/login'],{queryParams:{
        returnUrl: state.url 
      }})
        return false;
    }
    return true;
  }
}