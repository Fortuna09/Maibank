import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavBar } from '../../Components/nav-bar/nav-bar';

@Component({
  selector: 'app-finance-page',
  imports: [NavBar, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './finance-page.html',
  styleUrl: './finance-page.scss',
})
export class FinancePage {}
