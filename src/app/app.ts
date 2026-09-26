import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackLayer } from './Components/feedback-layer/feedback-layer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FeedbackLayer],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
}
