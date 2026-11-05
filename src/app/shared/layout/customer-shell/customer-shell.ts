import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../footer/footer';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-customer-shell',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './customer-shell.html',
})
export class CustomerShell {}
