import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Icon } from '../../Components/icon/icon';
import { AppearanceService } from '../../Services/appearance.service';

/** Casca das telas sem login: apresentação do app à esquerda, formulário à direita. */
@Component({
  selector: 'app-auth-page',
  imports: [RouterOutlet, Icon],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})
export class AuthPage implements OnInit {
  private readonly appearance = inject(AppearanceService);

  readonly features = [
    { icon: 'sliders', title: 'Divisões', text: 'Cada real com um destino: uso diário, reserva, planos.' },
    { icon: 'card', title: 'Crédito sem susto', text: 'Parcelas caem na fatura certa, sem bagunçar o saldo.' },
    { icon: 'target', title: 'Metas', text: 'Quanto guardar e quando você chega lá.' },
    { icon: 'trend-up', title: 'Simulações', text: 'O efeito de uma compra nos próximos meses, antes de comprar.' },
  ];

  ngOnInit(): void {
    // Tema e cor de destaque ficam no navegador: a tela de login já abre do jeito da pessoa.
    this.appearance.initialize();
  }
}
