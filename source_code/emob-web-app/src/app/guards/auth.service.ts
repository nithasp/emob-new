import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn:boolean = false;

  constructor(){
    this.loggedIn = this.getLoggedIn()
  }

  login() {
    this.loggedIn = true;
    this.setLoggedIn(this.loggedIn)
    return this.loggedIn
  }

  logout() {
    this.loggedIn = false;
    this.removeLoggedIn()
    return this.loggedIn;
  }

  isAuthenticated(): boolean {
    if(!this.loggedIn){
      this.loggedIn = this.getLoggedIn()
    }
    return this.loggedIn;
  }

  private setLoggedIn(isLogin:boolean){
    localStorage.setItem("loggedIn",String(isLogin));
  }
  private getLoggedIn(): boolean{
    return Boolean(localStorage.getItem("loggedIn"));
  }

  private removeLoggedIn(): boolean{
    return Boolean(localStorage.removeItem("loggedIn"));
  }
}