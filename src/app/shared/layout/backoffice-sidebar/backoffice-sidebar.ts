import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandMark } from '../../ui/brand-mark/brand-mark';
import { BackofficeMenu } from '../backoffice-menu';

@Component({
  selector: 'app-backoffice-sidebar',
  imports: [RouterLink, RouterLinkActive, BrandMark],
  templateUrl: './backoffice-sidebar.html',
})
export class BackofficeSidebar {
  protected readonly menu = inject(BackofficeMenu);
}
