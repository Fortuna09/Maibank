import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AssistantPanel } from '../../Components/assistant-panel/assistant-panel';
import { NavBar } from '../../Components/nav-bar/nav-bar';
import { TourOverlay } from '../../Components/tour-overlay/tour-overlay';
import { TransactionModal } from '../../Components/transaction-modal/transaction-modal';
import { TourService } from '../../Services/tour.service';

/**
 * Casca da área logada: barra lateral, conteúdo, modal de lançamento, a Mai e o tour guiado.
 * Fica montada enquanto se navega entre as telas filhas — a navbar não é recriada.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, NavBar, TransactionModal, AssistantPanel, TourOverlay],
  template: `
    <div class="app-shell">
      <app-nav-bar />

      <div class="app-content">
        <router-outlet />
      </div>
    </div>

    <app-transaction-modal />
    <app-assistant-panel />
    <app-tour-overlay />
  `,
})
export class AppShell implements OnInit {
  private readonly tour = inject(TourService);

  ngOnInit(): void {
    this.tour.startIfFirstVisit();
  }
}
