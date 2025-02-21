import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import $ from 'jquery';
@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit{
  constructor(
    private router: Router
  ){}

  ngOnInit() {
    this.ActiveUI();
  }

  logout(){
    console.log("Delete USer")
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
