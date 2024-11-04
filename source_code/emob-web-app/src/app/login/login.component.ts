import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { AuthService } from '../guards/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit{
  dataLogin: FormGroup = new FormGroup({
    username: new FormControl("", [Validators.required, Validators.maxLength(32)]),
    password: new FormControl("", [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(16)
    ])
  });
  hiddenPassword: boolean =false;
  hide: boolean =false;
  errorUser:boolean = false;
  constructor(
    private router: Router,
    private userService : UserService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private spinner:NgxSpinnerService
  ){
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/users']);
  }

  }

  async ngOnInit(): Promise<void> {
    console.warn("test");
  }

  async onLogin() {
    this.spinner.show()
    console.log(this.dataLogin.value)
    if (this.dataLogin.invalid) {
      console.error("Password")
      return;
    } else {
      let isActive = this.userService.login(this.dataLogin.value);
        console.debug(`isActive : ${isActive}`)
      if(isActive){
        console.debug("login success")
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/users';
                    this.router.navigateByUrl(returnUrl);
        
      }else{
        console.log(`error user is ${this.errorUser}`)
        this.errorUser = true
      }
    }
    setTimeout(() => {
      /** spinner ends after 5 seconds */
      this.spinner.hide();
    }, 1000);
  }

}
