import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompanyStore } from '../../../core/services/company-store';
import { BrandMark } from '../../ui/brand-mark/brand-mark';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, BrandMark],
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly anio = new Date().getFullYear();
  protected readonly business = inject(CompanyStore).info;
}
