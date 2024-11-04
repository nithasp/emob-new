import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM, { ATTRIBUTION } from 'ol/source/OSM';
import {
  defaults as defaultControls,
  ZoomSlider,
  FullScreen
} from "ol/control";
import * as OlProj from "ol/proj";
import { Time } from 'src/app/models/time.model';
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Subscription, catchError, finalize, last, map, tap } from 'rxjs';
import { none } from 'ol/centerconstraint';
@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit {
  allFiles: File[] = [];
  readonly panelOpenState = signal(false);
  private _formBuilder = inject(FormBuilder);
  public map!: Map
  @Input()
  requiredFileType:string = 'image/png';
  public fileName:String = '';
  public uploadProgress:Number = -1 ;
  public uploadSub!: Subscription ;
  value:String = 'File';
  active = 1;
  test_value:Time = new Time(9,0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.map = new Map({
    layers: [
      new TileLayer({
        className: 'bw',
        source: new OSM()
      }),
    ],
    target: 'map',
    view: new View({
      center: OlProj.transform(
        [100.4683014,13.7248785],
        "EPSG:4326",
        "EPSG:3857"
      ),
      zoom: 10,
      maxZoom: 16,
      minZoom: 10
    }),
    controls: defaultControls({ attribution: false }).extend([
      new ZoomSlider(),
      new FullScreen()
    ])
  });
 }

  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required],
  });
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
  isLinear = false;


  prependZero(num:number) {
    if (num <= 9)
        return "0" + num;
    else
        return num;
 }

 onFileSelected(files:any) {
  console.log(files)
  const file:File = files.target.files[0];


  if (file) {
      this.allFiles.push(file);
      
  }
  
}
uploadFile(file:any){
  const formData = new FormData();
      formData.append("thumbnail", file);
  const upload$ = this.http.post("http://localhost:8080/fileupload", formData, {
        reportProgress: true,
        observe: 'events'
    })
    .pipe(
        finalize(() => this.reset())
    );
  
    this.uploadSub = upload$.subscribe(event => {
      this.uploadProgress = this.getEventMessage(event)
    })
}
  droppedFiles(allFiles:any): void {
  const filesAmount = allFiles.length;
  console.log(allFiles);
  for (let i = 0; i < filesAmount; i++) {
    const file = allFiles[i];
    this.allFiles.push(file);
  }
}
deleteFileinList(index:number){
  this.allFiles.splice(index,1)

}
  cancelUpload() {
    this.uploadSub.unsubscribe();
    this.reset();
  }

  reset() {
    this.uploadProgress = -1;
    this.uploadSub.unsubscribe();
  }
  private getEventMessage(event: HttpEvent<any>):Number {
   
      if(event.type==HttpEventType.UploadProgress){
        // Compute and show the % done:
        const percentDone = event.total ? Math.round(100 * event.loaded / event.total) : 0;
        return percentDone;
      }else{
        return 0;
      }
        
  
  }
}
