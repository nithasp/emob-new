import { Injectable } from '@angular/core';
import { AuthService } from '../guards/auth.service';

const mockUser = {
  username : "UserTest01",
  password : "P@ssw0rd1234",
  role: "User"
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  public role:string = '';

  constructor(
    private authService: AuthService
  ) { 
    this.role = this.getRole()
  }

  login(data:any){
    if(data.username == mockUser.username && data.password == mockUser.password){
      this.role = mockUser.role
      this.setRole(this.role)
      return this.authService.login()
  }else{
    return false
  }
  }
  logout(){
    this.removeRole();
    const user =this.authService.logout()
    return user;
  }
  private setRole(role:string){
    localStorage.setItem("role",role);

  }
  private getRole():string{
    return String(localStorage.getItem("role"))
  }

  private removeRole():string{
    return String(localStorage.removeItem("role"))
  }
}
