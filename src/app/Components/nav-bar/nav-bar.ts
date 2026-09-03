import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar implements OnInit {
  theme: 'dark' | 'light' = 'dark';
  isMenuOpen = true;

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('maibank-theme') as 'dark' | 'light' | null;
    this.theme = savedTheme ?? 'dark';
    this.applyTheme(this.theme);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.theme);
  }

  private applyTheme(nextTheme: 'dark' | 'light'): void {
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('maibank-theme', nextTheme);
  }
}
