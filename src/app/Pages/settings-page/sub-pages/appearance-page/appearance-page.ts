import { NgFor, NgIf } from '@angular/common';
import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../../../../Components/icon/icon';
import { AppearanceService } from '../../../../Services/appearance.service';
import { FeedbackService } from '../../../../Services/feedback.service';

@Component({
  selector: 'app-appearance-page',
  imports: [NgFor, NgIf, Icon],
  templateUrl: './appearance-page.html',
  styleUrl: './appearance-page.scss',
})
export class AppearancePage implements OnInit {
  readonly appearance = inject(AppearanceService);
  private readonly feedback = inject(FeedbackService);
  private readonly preview = viewChild<ElementRef<HTMLDivElement>>('coverPreview');

  readonly accentPresets = ['#2dd4ee', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#eab308'];
  readonly saving = signal(false);

  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private startPositionX = 50;
  private startPositionY = 50;

  private readonly onPointerMove = (event: PointerEvent) => this.handlePointerMove(event);
  private readonly onPointerUp = () => this.stopDrag();

  ngOnInit(): void {
    this.appearance.initialize();
  }

  onAccentColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.appearance.setAccentColor(input.value);
  }

  onNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.appearance.setUserName(input.value);
  }

  saveAll(): void {
    // A aparência já é persistida a cada mudança (localStorage); aqui só confirmamos visualmente.
    this.saving.set(true);
    void this.feedback
      .run(() => Promise.resolve(), { success: 'Aparência salva' })
      .finally(() => this.saving.set(false));
  }

  onZoomChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.appearance.setCoverZoom(Number(input.value));
  }

  startDrag(event: PointerEvent): void {
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.startPositionX = this.appearance.coverPositionX();
    this.startPositionY = this.appearance.coverPositionY();
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }

    const box = this.preview()?.nativeElement.getBoundingClientRect();
    if (!box) {
      return;
    }

    const deltaX = ((event.clientX - this.dragStartX) / box.width) * 100;
    const deltaY = ((event.clientY - this.dragStartY) / box.height) * 100;

    this.appearance.setCoverPosition(this.startPositionX - deltaX, this.startPositionY - deltaY);
  }

  private stopDrag(): void {
    this.dragging = false;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}
