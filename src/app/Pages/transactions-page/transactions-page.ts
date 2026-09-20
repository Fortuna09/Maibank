import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../../Components/icon/icon';
import { TransactionModalService } from '../../Services/transaction-modal.service';

@Component({
  selector: 'app-transactions-page',
  imports: [Icon, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.scss',
})
export class TransactionsPage {
  readonly modal = inject(TransactionModalService);
}
