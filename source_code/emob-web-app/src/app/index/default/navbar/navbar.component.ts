import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  constructor(
    private userService: UserService,
    private router: Router
  ){}

  logout(){
    console.log("Delete USer")
    const user = this.userService.logout();
    console.log(`confirm delete user : ${user}`)
    this.router.navigate(['/login'])
  }

}
