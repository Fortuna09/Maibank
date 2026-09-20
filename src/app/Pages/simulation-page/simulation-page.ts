import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-simulation-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './simulation-page.html',
  styleUrl: './simulation-page.scss',
})
export class SimulationPage {}
