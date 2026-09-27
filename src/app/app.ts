import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackLayer } from './Components/feedback-layer/feedback-layer';
import { UpdateBanner } from './Components/update-banner/update-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FeedbackLayer, UpdateBanner],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
}
