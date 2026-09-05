import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  AfterViewInit,
  output,
  inject,
} from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-dialog',
  imports: [Icon],
  template: ` <div class="modal-backdrop" (click)="backdrop($event)">
    <section class="modal" role="dialog" aria-modal="true" [attr.aria-label]="title" tabindex="-1">
      <header class="modal-head">
        <div>
          <span class="eyebrow">CAFETERIA ADMIN</span>
          <h2>{{ title }}</h2>
        </div>
        <button
          type="button"
          class="icon-button"
          aria-label="Close dialog"
          [disabled]="busy"
          (click)="closed.emit()"
        >
          <app-icon name="close" />
        </button>
      </header>
      <ng-content />
    </section>
  </div>`,
})
export class Dialog implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() busy = false;
  closed = output<void>();
  private element: ElementRef<HTMLElement> = inject(ElementRef);
  private previous = document.activeElement as HTMLElement | null;
  private overflow = document.body.style.overflow;
  ngAfterViewInit() {
    document.body.style.overflow = 'hidden';
    this.element.nativeElement.querySelector<HTMLElement>('.modal')?.focus();
  }
  ngOnDestroy() {
    document.body.style.overflow = this.overflow;
    this.previous?.focus();
  }
  backdrop(event: MouseEvent) {
    if (event.target === event.currentTarget && !this.busy) this.closed.emit();
  }
  @HostListener('keydown', ['$event']) key(event: KeyboardEvent) {
    if (event.key === 'Escape' && !this.busy) this.closed.emit();
    if (event.key !== 'Tab') return;
    const elements = Array.from(
      this.element.nativeElement.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
      ),
    );
    const first = elements[0],
      last = elements.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === this.element.nativeElement.querySelector('.modal'))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !elements.length)) {
      event.preventDefault();
      first?.focus();
    }
  }
}
