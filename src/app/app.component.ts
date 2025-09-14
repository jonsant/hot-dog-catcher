
import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  onStopClick() {
    if (this.gameComponent) {
      this.gameComponent.stopGame();
    }
  }
  title = 'dog-catcher';
  // Use template reference variable for child component
  @ViewChild('game', { static: false }) gameComponent!: any;

  onPauseClick() {
    if (this.gameComponent) {
      this.gameComponent.togglePause();
    }
  }
}
