import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../../Components/icon/icon';
import { TransactionModalService } from '../../Services/transaction-modal.service';

@Component({
  selector: 'app-transactions-page',
  imports: [Icon, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.scss',
})
export class TransactionsPage implements OnInit {
  readonly modal = inject(TransactionModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Atalho do ícone do app no celular ("Novo lançamento") chega com ?novo=1. */
  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('novo') === '1') {
      this.modal.open();
      void this.router.navigate([], { relativeTo: this.route, queryParams: { novo: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }
}
