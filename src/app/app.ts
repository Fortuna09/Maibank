import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AssistantPanel } from './Components/assistant-panel/assistant-panel';
import { FeedbackLayer } from './Components/feedback-layer/feedback-layer';
import { NavBar } from './Components/nav-bar/nav-bar';
import { TransactionModal } from './Components/transaction-modal/transaction-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBar, TransactionModal, FeedbackLayer, AssistantPanel],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
}
