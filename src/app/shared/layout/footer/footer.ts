import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS_INFO } from '../../../core/config/business.config';
import { BrandMark } from '../../ui/brand-mark/brand-mark';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, BrandMark],
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly anio = new Date().getFullYear();
  protected readonly business = BUSINESS_INFO;
}
