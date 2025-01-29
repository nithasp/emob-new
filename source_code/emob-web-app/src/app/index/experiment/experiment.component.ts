import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import {  Router } from '@angular/router';
import {  NgxSpinnerService } from 'ngx-spinner';
import { Experiment } from 'src/app/models/experiment.model';
import { ExperimentService } from 'src/app/services/experiment.service';



@Component({
  selector: 'app-experiment',
  templateUrl: './experiment.component.html',
  styleUrl: './experiment.component.scss'
})
export class ExperimentComponent implements AfterViewInit,OnInit {
  public displayedColumns = [
    {
      def: "select",
      label: "select",
      visible: true
    },
    {
      def: "Name",
      label: "Name",
      visible: true
    },
    {
      def: "actions",
      label: "Actions",
      visible: true
    },
    {
      def: "TimeStart",
      label: "Run Start",
      visible: true
    },
    {
      def: "TimeEnd",
      label: "Run End",
      visible: true
    },
    {
      def: "TimeDulatin",
      label: "Duration",
      visible: true
    },
    {
      def: "TriggeredBy",
      label: "Triggered By",
      visible: true
    },
    {
      def: "Status",
      label: "Status",
      visible: true
    },
    {
      def: "Run",
      label: "Run",
      visible: true
    },
    {
      def: "parameter",
      label: "Parameter",
      visible: true
    },
    {
      def: "RunId",
      label: "Run ID",
      visible: false
    },
    {
      def: "GroupId",
      label: "Group ID",
      visible: false
    }];
  dataSource = new MatTableDataSource<Experiment>();
  selection = new SelectionModel<Experiment>(true, []);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private readonly experimentService : ExperimentService,
    private readonly spinner : NgxSpinnerService,
    private readonly router: Router
  ){}
  ngOnInit(): void {
    this.spinner.show();
    this.experimentService.getExperiments().subscribe(response => {
      this.dataSource.data = response
      this.spinner.hide();
    });
      
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Experiment): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row `;
  }

  getDisplayedColumns(): string[] {
    return this.displayedColumns.filter(cd => cd.visible).map(cd => cd.def);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  createNewExperiment(){
    this.spinner.show();
    this.experimentService.createExperiment().subscribe(response =>{
      this.spinner.hide();
      this.router.navigate(['/users/run',response.RunId]);
      
    });
  }

  
}