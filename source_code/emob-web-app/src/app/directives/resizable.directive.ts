import { Directive, ElementRef, OnInit, Input, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: '[appResizable]'
})
export class ResizableDirective implements OnInit {
  @Input() resizableGrabWidth = 5;
  @Input() resizableMinWidth = 10;
  @Input() resizableMaxWidth: number = 90;

  private dragging = false;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.renderer.setStyle(this.el.nativeElement, 'border-right', `${this.resizableGrabWidth}px solid #f1f1f1`);
    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    this.renderer.setStyle(this.el.nativeElement, 'border-style', 'double');
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (this.inDragRegion(event)) {
      this.dragging = true;
      this.preventGlobalMouseEvents();
      event.stopPropagation();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) {
      this.setCursor(event);
      return;
    }
    this.resizeElement(event);
    event.stopPropagation();
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.dragging) {
      return;
    }
    this.restoreGlobalMouseEvents();
    this.dragging = false;
    event.stopPropagation();
  }

  private preventGlobalMouseEvents(): void {
    this.renderer.setStyle(document.body, 'pointer-events', 'none');
  }

  private restoreGlobalMouseEvents(): void {
    this.renderer.setStyle(document.body, 'pointer-events', 'auto');
  }

  private resizeElement(event: MouseEvent): void {
    const newWidth = Math.max(this.resizableMinWidth, event.clientX - this.el.nativeElement.offsetLeft);
    if (this.resizableMaxWidth && newWidth > this.resizableMaxWidth) {
      this.renderer.setStyle(this.el.nativeElement, 'width', `${this.resizableMaxWidth}px`);
    } else {
      this.renderer.setStyle(this.el.nativeElement, 'width', `${newWidth}px`);
    }
  }

  private setCursor(event: MouseEvent): void {
    if (this.inDragRegion(event)) {
      this.renderer.setStyle(this.el.nativeElement, 'cursor', 'col-resize');
    } else {
      this.renderer.setStyle(this.el.nativeElement, 'cursor', 'default');
    }
  }

  private inDragRegion(event: MouseEvent): boolean {
    return this.el.nativeElement.clientWidth - event.clientX + this.el.nativeElement.offsetLeft < this.resizableGrabWidth;
  }
}