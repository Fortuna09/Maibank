import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../../Components/icon/icon';
import { TransactionModalService } from '../../Services/transaction-modal.service';

@Component({
  selector: 'app-credit-page',
  imports: [Icon, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './credit-page.html',
  styleUrl: './credit-page.scss',
})
export class CreditPage {
  readonly modal = inject(TransactionModalService);

  openCreditModal(): void {
    this.modal.open({ title: 'Nova compra no crédito', type: 'credito' });
  }
}
