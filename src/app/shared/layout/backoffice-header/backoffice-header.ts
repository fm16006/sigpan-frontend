import { Component, inject, input } from '@angular/core';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-backoffice-header',
  templateUrl: './backoffice-header.html',
  styles: ``,
})
export class BackofficeHeader {
  kiosk = input(false);
  protected auth = inject(Auth);
}