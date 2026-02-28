import { Component } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {

  currentPage = 1;
  totalPages = 5; // cámbialo según tu API

  previous() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadData();
    }
  }

  next() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadData();
    }
  }

  loadData() {
    console.log('Cargando página:', this.currentPage);
    // Aquí llamas tu servicio GraphQL
  }
}
