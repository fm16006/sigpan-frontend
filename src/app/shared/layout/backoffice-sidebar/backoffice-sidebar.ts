import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-backoffice-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './backoffice-sidebar.html',
  styleUrl: './backoffice-sidebar.css',
})
export class BackofficeSidebar {}