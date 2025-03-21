import { LiveAnnouncer } from '@angular/cdk/a11y';
import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import {  Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {  NgxSpinnerService } from 'ngx-spinner';
import { Experiment } from 'src/app/models/experiment.model';
import { ConstraintService } from 'src/app/services/constraint.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import { DetailsDialogComponent } from '../components/details-dialog/details-dialog.component';



@Component({
  selector: 'app-experiment',
  templateUrl: './experiment.component.html',
  styleUrl: './experiment.component.scss'
})
export class ExperimentComponent implements AfterViewInit, OnDestroy, OnInit {

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
      def: "TimeDuration",
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

  interval: any;
  dataSource = new MatTableDataSource<Experiment>();
  selection = new SelectionModel<Experiment>(false);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  constructor(
    private readonly experimentService : ExperimentService,
    private readonly constraintService: ConstraintService,
    private readonly spinner : NgxSpinnerService,
    private readonly router: Router,
    private readonly ngbModal: NgbModal
  ){}
  ngOnInit(): void {
    this.spinner.show();
    this.loadData();
    this.interval = setInterval(() => {
      this.loadData();
    }, 30000); // 30 seconds
    this.spinner.hide();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    
  }


  loadData(): void {
    this.showSpinner();
    this.experimentService.getExperiments().subscribe(response => {
      this.dataSource.data = response;
      this.dataSource.sort = this.sort; // Ensure sort is set after data is loaded
      this.hiddenSpinner();
      
    });
  }
  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
 
  toggleSelection(row: any) {
    this.selection.clear(); // Clear previous selections
   this.selection.toggle(row); // Select the new row
  }
 
  /** The label for the checkbox on the passed row */
  checkboxLabel(row: Experiment): string {
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row `;
  }

  getDisplayedColumns(): string[] {
    return this.displayedColumns.filter(cd => cd.visible).map(cd => cd.def);
  }

  isSelectedStatusValue(status:string): boolean {
    return this.selection.selected.length > 0 ? this.selection.selected[0].status === status : false;
  }
  

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  
  
  

  createNewExperiment(){
    this.spinner.show();
    this.experimentService.createExperiment().subscribe(response =>{
      this.spinner.hide();
      this.router.navigate(['/users/run',response.runId]);
      
    });
  }

  getParameter(runId:string){
    this.constraintService.getParameter(runId).subscribe(
      response=>{
        console.log(response);
        this.openDetails("Parameters",this.objectToStringArray(response));
      }
    );
  }
  objectToStringArray(value:any): string[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    return Object.entries(value).map(([key, val]) => `${key}: ${val}`);
  }

  objectToStringWithNewlines(obj: { [key: string]: any }): string {
    return Object.entries(obj)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
  

  openDetails(title:string,message:string | string[]) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    console.log(`alertInvalidation: title = ${title}, message = ${message}`);
    const dialogRef = this.ngbModal.open(DetailsDialogComponent, {
      centered: true,
      animation: true,
      size: 'lg'
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    dialogRef.result.then((confirmed: boolean) => {
      console.log(`alertInvalidation: confirmed = ${confirmed}`);
      if (confirmed) {
        console.log('confirmed');
      }
    });
  }

  showSpinner() {
    this.spinner.show('experiment', {
      type: 'ball-beat',
      size: 'medium',
      bdColor: 'rgba(255,255,255, .9)',
      color: 'black',
      fullScreen: false,
    });
  }
  hiddenSpinner() {
    setTimeout(() => {
      this.spinner.hide('experiment');
    },1000)
  }
}