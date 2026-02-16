import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WelcomeTourComponent } from './shared/components/welcome-tour/welcome-tour.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WelcomeTourComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';
}
