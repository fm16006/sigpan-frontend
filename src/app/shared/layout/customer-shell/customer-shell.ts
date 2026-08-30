import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-customer-shell',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './customer-shell.html',
  styleUrl: './customer-shell.css',
})
export class CustomerShell {}