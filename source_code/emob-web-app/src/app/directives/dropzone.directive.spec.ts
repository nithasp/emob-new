import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DropzoneDirective } from './dropzone.directive';

@Component({
  template: `<div DropZone (fileDropped)="onFileDropped($event)"></div>`,
})
class DropzoneHostComponent {
  dropped: FileList | null = null;
  dropCount = 0;

  onFileDropped(files: FileList): void {
    this.dropped = files;
    this.dropCount++;
  }
}

function createDataTransfer(...files: File[]): DataTransfer {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer;
}

function createExcelFile(name = 'config.xlsx'): File {
  return new File(['dummy'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('DropzoneDirective', () => {
  let fixture: ComponentFixture<DropzoneHostComponent>;
  let host: DropzoneHostComponent;
  let dropzoneEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DropzoneHostComponent, DropzoneDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(DropzoneHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    dropzoneEl = fixture.debugElement.query(
      By.directive(DropzoneDirective)
    ).nativeElement;
  });

  /**
   * Dispatches a real DragEvent on the host element so the tests exercise the
   * @HostListener wiring as well, instead of calling the handlers directly.
   */
  function dispatchDragEvent(type: string, dataTransfer?: DataTransfer): DragEvent {
    const event = new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer ?? null,
    });
    dropzoneEl.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  function isActive(): boolean {
    return dropzoneEl.classList.contains('dropzone-active');
  }

  describe('dragenter / dragover', () => {
    it('should activate the host styling on dragenter', () => {
      dispatchDragEvent('dragenter', createDataTransfer());

      expect(isActive()).toBeTrue();
      expect(dropzoneEl.style.opacity).toBe('0.8');
      expect(dropzoneEl.style.borderStyle).toBe('dotted');
    });

    it('should activate on dragover and request the copy drop effect', () => {
      const dataTransfer = createDataTransfer();
      // Chrome ignores dropEffect assignments outside a real OS drag session,
      // so capture the value the directive writes instead of reading it back.
      let dropEffect: string | undefined;
      Object.defineProperty(dataTransfer, 'dropEffect', {
        set: (value: string) => (dropEffect = value),
      });

      dispatchDragEvent('dragover', dataTransfer);

      expect(isActive()).toBeTrue();
      expect(dropEffect).toBe('copy');
    });

    it('should not fail on dragover without a dataTransfer', () => {
      expect(() => dispatchDragEvent('dragover')).not.toThrow();
      expect(isActive()).toBeTrue();
    });

    it('should prevent the browser default handling for all drag events', () => {
      for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
        const event = dispatchDragEvent(type, createDataTransfer());
        expect(event.defaultPrevented).withContext(type).toBeTrue();
      }
    });
  });

  describe('dragleave', () => {
    it('should stay active while moving over nested children and deactivate on the last leave', () => {
      // Dragging over a child fires an extra dragenter (bubbling) before the
      // dragleave of the parent, which is what the drag counter compensates for.
      dispatchDragEvent('dragenter', createDataTransfer());
      dispatchDragEvent('dragenter', createDataTransfer());

      dispatchDragEvent('dragleave', createDataTransfer());
      expect(isActive()).toBeTrue();

      dispatchDragEvent('dragleave', createDataTransfer());
      expect(isActive()).toBeFalse();
      expect(dropzoneEl.style.opacity).toBe('');
      expect(dropzoneEl.style.border).toBe('');
    });

    it('should not let a stray dragleave break the next drag cycle', () => {
      dispatchDragEvent('dragleave', createDataTransfer());
      expect(isActive()).toBeFalse();

      dispatchDragEvent('dragenter', createDataTransfer());
      expect(isActive()).toBeTrue();

      dispatchDragEvent('dragleave', createDataTransfer());
      expect(isActive()).toBeFalse();
    });
  });

  describe('drop', () => {
    it('should emit the dropped files and clear the active state', () => {
      dispatchDragEvent('dragenter', createDataTransfer());

      dispatchDragEvent('drop', createDataTransfer(createExcelFile()));

      expect(host.dropCount).toBe(1);
      expect(host.dropped?.length).toBe(1);
      expect(host.dropped?.[0].name).toBe('config.xlsx');
      expect(isActive()).toBeFalse();
      expect(dropzoneEl.style.opacity).toBe('');
      expect(dropzoneEl.style.border).toBe('');
    });

    it('should not emit when the drop contains no files', () => {
      dispatchDragEvent('dragenter', createDataTransfer());

      dispatchDragEvent('drop', createDataTransfer());

      expect(host.dropCount).toBe(0);
      expect(isActive()).toBeFalse();
    });

    it('should not emit when the drop has no dataTransfer', () => {
      dispatchDragEvent('drop');

      expect(host.dropCount).toBe(0);
    });

    it('should reset the drag counter so the next drag cycle behaves normally', () => {
      dispatchDragEvent('dragenter', createDataTransfer());
      dispatchDragEvent('dragenter', createDataTransfer());
      dispatchDragEvent('drop', createDataTransfer(createExcelFile()));

      dispatchDragEvent('dragenter', createDataTransfer());
      dispatchDragEvent('dragleave', createDataTransfer());

      expect(isActive()).toBeFalse();
    });
  });
});
