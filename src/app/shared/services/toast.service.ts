import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  duration?: number; // ms
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messagesSignal = signal<ToastMessage[]>([]);
  private counter = 0;

  readonly messages = this.messagesSignal.asReadonly();

  show(text: string, duration = 2200): void {
    const id = ++this.counter;
    const msg: ToastMessage = { id, text, duration };
    this.messagesSignal.update((arr) => [...arr, msg]);
    window.setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this.messagesSignal.update((arr) => arr.filter((m) => m.id !== id));
  }
}

