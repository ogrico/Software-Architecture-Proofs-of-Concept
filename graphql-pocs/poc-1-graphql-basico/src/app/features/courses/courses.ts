import { Component } from '@angular/core';
import { Head } from '../../shared/head/head';
import { Pagination } from '../../shared/pagination/pagination';
import { Detail } from './detail/detail';

@Component({
  selector: 'app-courses',
  imports: [Head, Pagination, Detail],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
})
export class Courses {

  showDetail = false;

  toggleDetail() {
    this.showDetail = true;
    console.log('toggleDetail', this.showDetail);
  }

}
