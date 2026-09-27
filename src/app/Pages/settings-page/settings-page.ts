import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ScrollActiveTabDirective } from '../../Directives/scroll-active-tab.directive';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ScrollActiveTabDirective],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {}
