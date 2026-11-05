import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackofficeHeader } from '../backoffice-header/backoffice-header';
import { BackofficeSidebar } from '../backoffice-sidebar/backoffice-sidebar';

@Component({
  selector: 'app-backoffice-shell',
  imports: [RouterOutlet, BackofficeSidebar, BackofficeHeader],
  templateUrl: './backoffice-shell.html',
})
export class BackofficeShell {}
