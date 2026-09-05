import { Injectable, computed, signal } from '@angular/core';
export interface Activity {
  id: number;
  title: string;
  detail: string;
  at: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  readonly items = signal<Activity[]>([]);
  readonly unread = computed(() => this.items().filter((item) => !item.read).length);
  add(title: string, detail: string) {
    this.items.update((items) =>
      [
        {
          id: Date.now() + Math.random(),
          title,
          detail,
          at: new Date(),
          read: false,
        },
        ...items,
      ].slice(0, 30),
    );
  }
  markRead() {
    this.items.update((items) => items.map((item) => ({ ...item, read: true })));
  }
  clear() {
    this.items.set([]);
  }
}
