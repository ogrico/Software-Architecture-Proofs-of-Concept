import { Routes } from '@angular/router';
import { Courses } from './features/courses/courses';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'courses',
    pathMatch: 'full'
  },
  {
    path: 'courses',
    component: Courses
  }
];
