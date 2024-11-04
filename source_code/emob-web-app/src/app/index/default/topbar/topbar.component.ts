import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import $ from 'jquery';
@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit{
  constructor(
    private userService: UserService,
    private router: Router
  ){}

  ngOnInit() {
    this.ActiveUI();
  }

  logout(){
    console.log("Delete USer")
    const user = this.userService.logout();
    console.log(`confirm delete user : ${user}`)
    this.router.navigate(['/login'])
  }

  private ActiveUI() {
    let routePath = this.router.url.substring(1).split('/')[1]
    console.log(routePath)
    $(document).ready(function(){
      $(".nav-item").click(function() {
        $("li.nav-item").removeClass("active");
        console.log(this)
        $(this).toggleClass("active");
      });
      if (!$(".nav-item").data("clicked")) {
        $("li.nav-item").removeClass("active");
        $("#"+routePath).toggleClass("active");
      }
    });
  }
}
