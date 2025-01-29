import { Component, OnInit } from '@angular/core';
import { ConstraintService } from 'src/app/services/constraint.service';

@Component({
  selector: 'app-constraint',
  templateUrl: './constraint.component.html',
  styleUrl: './constraint.component.scss'
})
export class ConstraintComponent implements OnInit{
  activeColor: Array<string> = [];

  constructor(private readonly constraintService : ConstraintService){

  }

  ngOnInit(): void {
    console.log(" Constraint :");
    this.constraintService.getParameter().subscribe(
      res =>{
        console.log("response from Constraint :",res);
      }
    )
  }

}
