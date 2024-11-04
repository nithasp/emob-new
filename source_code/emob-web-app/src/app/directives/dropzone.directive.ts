
import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[DropZone]'
})
export class DropzoneDirective {
  @Output() onFileDropped = new EventEmitter<any>();

  @HostBinding('style.opacity') private opacity = '1';
  @HostBinding('style.border') private border = 'none';

  @HostListener('dragover', ['$event']) public onDragOver(evt: any): any {
    evt.preventDefault();
    evt.stopPropagation();
    this.opacity = '0.8';
    this.border = 'dotted 2px #FF4D2A';
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(evt: any): any {
    evt.preventDefault();
    evt.stopPropagation();
    this.opacity = '1';
    this.border = 'none';
  }

  @HostListener('drop', ['$event']) public ondrop(evt: any): any {
    evt.preventDefault();
    evt.stopPropagation();
    this.opacity = '1';
    this.border = 'none';
    const files = evt.dataTransfer.files;
    if (files.length > 0) {
      this.onFileDropped.emit(files);
    }
  }
}