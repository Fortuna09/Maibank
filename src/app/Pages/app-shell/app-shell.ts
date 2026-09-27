import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AssistantPanel } from '../../Components/assistant-panel/assistant-panel';
import { NavBar } from '../../Components/nav-bar/nav-bar';
import { TourOverlay } from '../../Components/tour-overlay/tour-overlay';
import { TransactionModal } from '../../Components/transaction-modal/transaction-modal';
import { WhatsNewDialog } from '../../Components/whats-new-dialog/whats-new-dialog';
import { TourService } from '../../Services/tour.service';
import { WhatsNewService } from '../../Services/whats-new.service';

/**
 * Casca da área logada: barra lateral, conteúdo, modal de lançamento, a Mai, o tour guiado
 * e o aviso de novidades.
 * Fica montada enquanto se navega entre as telas filhas — a navbar não é recriada.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, NavBar, TransactionModal, AssistantPanel, TourOverlay, WhatsNewDialog],
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
    <app-whats-new-dialog />
  `,
})
export class AppShell implements OnInit {
  private readonly tour = inject(TourService);
  private readonly whatsNew = inject(WhatsNewService);

  ngOnInit(): void {
    // Novidades antes do tour: conta nova é marcada como em dia, e só então o tour abre.
    this.whatsNew.checkOnEnter();
    this.tour.startIfFirstVisit();
  }
}
