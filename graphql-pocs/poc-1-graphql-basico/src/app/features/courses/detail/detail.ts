import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-detail',
  imports: [],
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class Detail {

  @Output() close = new EventEmitter<void>();

  closeDetail() {
    this.close.emit();
  }

}
