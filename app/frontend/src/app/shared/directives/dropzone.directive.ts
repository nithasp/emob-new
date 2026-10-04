
import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[DropZone]'
})
export class DropzoneDirective {
  @Output() fileDropped = new EventEmitter<FileList>();

  @HostBinding('class.dropzone-active') private isActive = false;
  @HostBinding('style.opacity') private opacity: string | null = null;
  @HostBinding('style.border') private border: string | null = null;

  private dragCounter = 0;

  @HostListener('dragenter', ['$event']) public onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    this.setActive(true);
  }

  @HostListener('dragover', ['$event']) public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.setActive(true);
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter = Math.max(0, this.dragCounter - 1);
    if (this.dragCounter === 0) {
      this.setActive(false);
    }
  }

  @HostListener('drop', ['$event']) public ondrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter = 0;
    this.setActive(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.fileDropped.emit(files);
    }
  }

  private setActive(active: boolean): void {
    this.isActive = active;
    this.opacity = active ? '0.8' : null;
    this.border = active ? 'dotted 2px #FF4D2A' : null;
  }
}
