import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppearanceService } from '../../Services/appearance.service';
import { AssistantService } from '../../Services/assistant.service';
import { TourService } from '../../Services/tour.service';
import { Icon } from '../icon/icon';
import { MaiMark } from '../mai-mark/mai-mark';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive, Icon, MaiMark],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar implements OnInit {
  readonly appearance = inject(AppearanceService);
  readonly assistant = inject(AssistantService);
  readonly tour = inject(TourService);
  isMenuOpen = true;

  ngOnInit(): void {
    this.isMenuOpen = localStorage.getItem('maibank-menu-open') !== 'false';
    this.appearance.initialize();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    localStorage.setItem('maibank-menu-open', String(this.isMenuOpen));
  }

}
