import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ScrollActiveTabDirective } from '../../Directives/scroll-active-tab.directive';
import { AuthService } from '../../Services/auth.service';
import { visibleSettingsSections } from '../../Utils/settings-sections';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ScrollActiveTabDirective],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly auth = inject(AuthService);
  readonly sections = computed(() => visibleSettingsSections(this.auth.isAdmin()));
}
