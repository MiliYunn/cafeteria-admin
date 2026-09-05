import { Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiService, UploadResult, errorMessage } from '../core/api.service';
import { ActivityService } from '../core/activity.service';
import { Icon } from '../shared/icon';
import { ACCEPTED_FILES, validateFile } from '../shared/upload-validation';

@Component({
  selector: 'app-uploads',
  imports: [Icon, DatePipe],
  template: ` <section class="page-heading">
      <div>
        <div class="eyebrow">CAMPUS TOOLKIT</div>
        <h1>File library<span class="heading-dot">.</span></h1>
        <p>A place for the images and documents that bring your campus to life.</p>
      </div>
      <span class="storage-badge"><app-icon name="folder" [size]="16" />Local storage</span>
    </section>
    <div class="upload-layout">
      <section class="card upload-main">
        <header class="card-header">
          <div>
            <h2>Upload a file</h2>
            <p>Ready for shop logos, payment images, and more.</p>
          </div>
          <span class="mini-icon"><app-icon name="upload" /></span>
        </header>
        <div class="upload-body">
          <div
            class="dropzone"
            [class.dragging]="dragging()"
            (dragover)="$event.preventDefault(); dragging.set(true)"
            (dragleave)="dragging.set(false)"
            (drop)="drop($event)"
          >
            <span class="upload-cloud"><app-icon name="upload" [size]="34" /></span>
            <h3>Drop your file right here</h3>
            <p>or choose one from your computer</p>
            <label class="btn btn-primary file-pick"
              ><app-icon name="plus" [size]="17" />Browse files<input
                type="file"
                [accept]="accept"
                [disabled]="busy()"
                (change)="choose($event)"
                aria-label="Choose file to upload" /></label
            ><small>JPG, PNG, WebP, GIF or PDF · Up to 5 MB</small>
          </div>
          @if (error()) {
            <div class="error-banner mt-4" role="alert">{{ error() }}</div>
          }
          @if (selected()) {
            <div class="selected-file">
              @if (preview()) {
                <img [src]="preview()" alt="Selected file preview" />
              } @else {
                <span class="mini-icon"><app-icon name="file" /></span>
              }
              <div>
                <strong>{{ selected()!.name }}</strong
                ><small>{{ size(selected()!.size) }}</small>
              </div>
              <button
                class="icon-button"
                aria-label="Remove selected file"
                [disabled]="busy()"
                (click)="clear()"
              >
                <app-icon name="close" [size]="18" />
              </button>
            </div>
            <button class="btn btn-primary upload-submit" [disabled]="busy()" (click)="upload()">
              <app-icon
                [name]="busy() ? 'loading' : 'upload'"
                [class.spin]="busy()"
                [size]="18"
              />{{ busy() ? 'Uploading…' : 'Upload file' }}
            </button>
          }
        </div>
      </section>
      <aside class="upload-guidance">
        <span class="eyebrow">A SMALL HEADS-UP</span>
        <h2>Upload once.<br />Use where you need it.</h2>
        <p>After uploading, copy the file URL into a shop logo or payment method field.</p>
        <div class="guidance-item">
          <app-icon name="image" [size]="21" /><span
            ><strong>Make a good impression</strong
            ><small>Use clear, well-cropped images for shop and payment logos.</small></span
          >
        </div>
        <div class="guidance-item">
          <app-icon name="globe" [size]="21" /><span
            ><strong>Uploaded files are public</strong
            ><small
              >Anyone with the URL can view a file. Don't upload private or sensitive
              documents.</small
            ></span
          >
        </div>
        <div class="guidance-item">
          <app-icon name="folder" [size]="21" /><span
            ><strong>Stored on your backend</strong
            ><small>Files are saved in the backend upload folder. S3 is not enabled.</small></span
          >
        </div>
      </aside>
    </div>
    <section class="card mt-7">
      <header class="card-header">
        <div>
          <h2>
            Uploaded in this visit
            <span class="count-pill">{{ files().length }}</span>
          </h2>
          <p>This is not a server-wide file list; the backend has no file-list endpoint.</p>
        </div>
      </header>
      @for (file of files(); track file.filename) {
        <div class="uploaded-row">
          <span class="mini-icon"><app-icon name="file" [size]="22" /></span>
          <div>
            <strong>{{ file.original_filename }}</strong
            ><small>{{ file.at | date: 'shortTime' }} · {{ file.url }}</small>
          </div>
          <button class="btn btn-secondary" (click)="copy(file.url)">
            <app-icon name="copy" [size]="16" />Copy URL</button
          ><a
            class="icon-button"
            [href]="file.url"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open uploaded file"
            ><app-icon name="external" [size]="18"
          /></a>
        </div>
      } @empty {
        <div class="empty-state compact">
          <app-icon name="folder" [size]="30" />
          <h3>Your next upload starts above</h3>
          <p>Uploaded files will appear here during this page visit.</p>
        </div>
      }
    </section>`,
})
export class Uploads implements OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastrService);
  private activity = inject(ActivityService);
  private destroyRef = inject(DestroyRef);
  readonly accept = ACCEPTED_FILES;
  selected = signal<File | null>(null);
  preview = signal('');
  busy = signal(false);
  error = signal('');
  dragging = signal(false);
  files = signal<(UploadResult & { at: Date })[]>([]);
  choose(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.select(file);
    input.value = '';
  }
  drop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    if (this.busy()) return;
    const file = event.dataTransfer?.files[0];
    if (file) this.select(file);
  }
  select(file: File) {
    this.clear();
    const error = validateFile(file);
    if (error) {
      this.error.set(error);
      return;
    }
    this.selected.set(file);
    if (/^image\//.test(file.type)) this.preview.set(URL.createObjectURL(file));
  }
  clear() {
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.preview.set('');
    this.selected.set(null);
    this.error.set('');
  }
  ngOnDestroy() {
    if (this.preview()) URL.revokeObjectURL(this.preview());
  }
  size(bytes: number) {
    return bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(1)} KB`;
  }
  upload() {
    const file = this.selected();
    if (!file || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .upload(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.files.update((files) => [{ ...response.data, at: new Date() }, ...files]);
          this.activity.add('File uploaded', file.name);
          this.toast.success('Your file is ready to use.');
          this.clear();
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.toast.error(errorMessage(error));
        },
      });
  }
  async copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('File URL copied.');
    } catch {
      this.toast.info('Clipboard unavailable. Select and copy the file URL shown in the list.');
    }
  }
}
