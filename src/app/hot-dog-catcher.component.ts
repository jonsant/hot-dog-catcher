import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';

interface HotDog {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
}

@Component({
    selector: 'app-hot-dog-catcher',
    templateUrl: './hot-dog-catcher.component.html',
    styleUrls: ['./hot-dog-catcher.component.scss']
})
export class HotDogCatcherComponent implements OnInit {
    // Store default sizes for scaling
    readonly DEFAULT_HAND_WIDTH = 200;
    readonly DEFAULT_HAND_HEIGHT = 200;
    readonly DEFAULT_HOTDOG_WIDTH = 80;
    readonly DEFAULT_HOTDOG_HEIGHT = 140;

    // Helper to set sizes based on device
    setElementSizesForScreen() {
        const isMobile = window.innerWidth <= 600;
        const scale = isMobile ? 0.6 : 1;
        this.handWidth = this.DEFAULT_HAND_WIDTH * scale;
        this.handHeight = this.DEFAULT_HAND_HEIGHT * scale;
        this.hotDogWidth = this.DEFAULT_HOTDOG_WIDTH * scale;
        this.hotDogHeight = this.DEFAULT_HOTDOG_HEIGHT * scale;
    }
    private lastTouchX: number | null = null;
    private touchActive: boolean = false;
    private touchRAF: number | null = null;
    quitByEscape = false;
    leftPressed = false;
    rightPressed = false;
    lastMissedMsgIdx: number | null = null;
    missedMsgAngle = 0;
    missedMsgOffsetX = 0;
    @ViewChild('gamecanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
    ctx!: CanvasRenderingContext2D;

    canvasWidth = 0;
    canvasHeight = 0;

    // Player hand (bun)
    handWidth = 200;
    handHeight = 200;
    handX = 160;
    handY = 550;
    handSpeed = 4; // Even slower hand movement for precise control

    // Hot dogs
    hotDogs: HotDog[] = [];
    hotDogWidth = 80;
    hotDogHeight = 140;
    hotDogSpeed = 3;
    hotDogInterval = 1200; // ms
    lastHotDogTime = 0;

    score = 0;
    level = 1;
    health = 5;
    animationFrameId: number | null = null;

    showPlayButton = true;
    gameStarted = false;
    gameOver = false;

    bunImg: HTMLImageElement | null = null;
    bunLoaded = false;
    hotDogImg: HTMLImageElement | null = null;
    hotDogLoaded = false;

    missedCount = 0;
    showMissedMsg = false;
    missedMsg = '';
    missedMsgTimeout: any = null;
    missedMsgOpacity = 1;
    missedMsgList = [
        "Hot Dog catcher? More like dog waster!!!",
        "God! You're wasting delicious dogs!!!",
        "Oh you need practice, for sure!"
    ];

    ngOnInit() {
        this.setElementSizesForScreen();
        // Set canvas size to fill window below toolbar
        this.setCanvasSize();
        const canvas = this.canvasRef.nativeElement;
        this.ctx = canvas.getContext('2d')!;
        this.resetGame();
        // Load bun image
        this.bunImg = new Image();
        this.bunImg.src = 'assets/bun.png';
        this.bunImg.onload = () => {
            this.bunLoaded = true;
            // Optionally, redraw if needed
            this.draw();
        };
        // Load hot dog image
        this.hotDogImg = new Image();
        this.hotDogImg.src = 'assets/dog.png';
        this.hotDogImg.onload = () => {
            this.hotDogLoaded = true;
            // Optionally, redraw if needed
            this.draw();
        };

        // Touch event listeners for mobile/touchscreen support
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
    }
    // Touch event handlers
    onTouchStart(event: TouchEvent) {
        if (event.touches.length > 0) {
            this.touchActive = true;
            const rect = this.canvasRef.nativeElement.getBoundingClientRect();
            const touch = event.touches[0];
            const touchX = touch.clientX - rect.left;
            this.lastTouchX = touchX;
            // Center hand on touch
            this.handX = Math.max(0, Math.min(this.canvasWidth - this.handWidth, touchX - this.handWidth / 2));
            this.startTouchRAF();
        }
        event.preventDefault();
    }

    onTouchMove(event: TouchEvent) {
        if (event.touches.length > 0) {
            this.touchActive = true;
            const rect = this.canvasRef.nativeElement.getBoundingClientRect();
            const touch = event.touches[0];
            const touchX = touch.clientX - rect.left;
            this.lastTouchX = touchX;
            this.handX = Math.max(0, Math.min(this.canvasWidth - this.handWidth, touchX - this.handWidth / 2));
            this.startTouchRAF();
        }
        event.preventDefault();
    }

    onTouchEnd(event: TouchEvent) {
        this.touchActive = false;
        this.lastTouchX = null;
        if (this.touchRAF) {
            cancelAnimationFrame(this.touchRAF);
            this.touchRAF = null;
        }
        event.preventDefault();

    }

    // Continuously update hand position while touch is active
    private startTouchRAF() {
        if (this.touchRAF) return;
        const update = () => {
            if (this.touchActive && this.lastTouchX !== null) {
                this.handX = Math.max(0, Math.min(this.canvasWidth - this.handWidth, this.lastTouchX - this.handWidth / 2));
                this.touchRAF = requestAnimationFrame(update);
            } else {
                this.touchRAF = null;
            }
        };
        this.touchRAF = requestAnimationFrame(update);
    }

    showRandomMissedMsg() {
        if (this.missedMsgTimeout) {
            clearTimeout(this.missedMsgTimeout);
        }
        // Prevent message on play screen
        if (this.showPlayButton) return;
        let idx: number;
        do {
            idx = Math.floor(Math.random() * this.missedMsgList.length);
        } while (this.missedMsgList.length > 1 && idx === this.lastMissedMsgIdx);
        this.lastMissedMsgIdx = idx;
        this.missedMsg = this.missedMsgList[idx];
        // Random angle between -10 and 10 degrees
        this.missedMsgAngle = (Math.random() * 20 - 10);
        // Random horizontal offset between -60 and 60px
        this.missedMsgOffsetX = Math.floor(Math.random() * 120 - 60);
        this.showMissedMsg = true;
        this.missedMsgOpacity = 1;
        // Fade out over 3 seconds
        const fadeDuration = 3000;
        const fadeSteps = 30;
        let step = 0;
        const fade = () => {
            step++;
            this.missedMsgOpacity = 1 - step / fadeSteps;
            if (step < fadeSteps) {
                this.missedMsgTimeout = setTimeout(fade, fadeDuration / fadeSteps);
            } else {
                this.showMissedMsg = false;
                this.missedMsgOpacity = 1;
            }
        };
        fade();
    }

    startGame() {
        this.quitByEscape = false;
        this.showPlayButton = false;
        this.gameStarted = true;
        this.gameOver = false;
        this.resetGame();
        this.level = 1;
        this.hotDogSpeed = 3; // Reset speed on new game
        this.health = 5;
        this.missedCount = 0;
        this.showMissedMsg = false;
        this.missedMsg = '';
        this.missedMsgOpacity = 1;
        this.gameLoop();
    }

    resetGame() {
        this.quitByEscape = false;
        this.handX = (this.canvasWidth - this.handWidth) / 2;
        this.hotDogs = [];
        this.score = 0;
        this.level = 1;
        this.hotDogSpeed = 3;
        this.health = 5;
        this.missedCount = 0;
        this.showMissedMsg = false;
        this.missedMsg = '';
        this.missedMsgOpacity = 1;
        this.lastHotDogTime = performance.now();
        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') {
            this.leftPressed = true;
        } else if (event.key === 'ArrowRight') {
            this.rightPressed = true;
        } else if (event.key === 'Escape') {
            if (this.gameStarted && !this.gameOver) {
                this.quitByEscape = true;
                this.gameOver = true;
                this.gameStarted = false;
                this.showPlayButton = true;
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                this.draw();
            }
        }
    }

    @HostListener('window:keyup', ['$event'])
    onKeyUp(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') {
            this.leftPressed = false;
        } else if (event.key === 'ArrowRight') {
            this.rightPressed = false;
        }
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        this.handX = Math.max(0, Math.min(this.canvasWidth - this.handWidth, mouseX - this.handWidth / 2));
    }

    @HostListener('window:resize')
    onResize() {
        this.setElementSizesForScreen();
        this.setCanvasSize();
        this.resetGame();
    }

    setCanvasSize() {
        // 60px toolbar height
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight - 60;
        if (this.canvasRef && this.canvasRef.nativeElement) {
            this.canvasRef.nativeElement.width = this.canvasWidth;
            this.canvasRef.nativeElement.height = this.canvasHeight;
        }
        // Adjust hand position to bottom
        this.handY = this.canvasHeight - this.handHeight * 0.94;
        // Ensure hand stays in bounds if resized
        this.handX = Math.max(0, Math.min(this.handX, this.canvasWidth - this.handWidth));
    }

    spawnHotDog() {
        // Start hot dog above the visible area
        const x = Math.random() * (this.canvasWidth - this.hotDogWidth);
        this.hotDogs.push({
            x,
            y: -this.hotDogHeight, // Start above the top
            width: this.hotDogWidth,
            height: this.hotDogHeight,
            speed: this.hotDogSpeed
        });
    }

    gameLoop = () => {
        if (!this.gameStarted) return;
        const now = performance.now();
        if (now - this.lastHotDogTime > this.hotDogInterval) {
            this.spawnHotDog();
            this.lastHotDogTime = now;
        }
        this.update();
        this.draw();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    update() {
        // Smooth hand movement
        if (this.leftPressed) {
            this.handX = Math.max(0, this.handX - this.handSpeed);
        }
        if (this.rightPressed) {
            this.handX = Math.min(this.canvasWidth - this.handWidth, this.handX + this.handSpeed);
        }
        // Smooth hand movement
        if (this.leftPressed) {
            this.handX = Math.max(0, this.handX - this.handSpeed);
        }
        if (this.rightPressed) {
            this.handX = Math.min(this.canvasWidth - this.handWidth, this.handX + this.handSpeed);
        }
        // Move hot dogs
        for (const hotDog of this.hotDogs) {
            hotDog.y += hotDog.speed;
        }
        // Check for catches
        this.hotDogs = this.hotDogs.filter(hd => {
            const handTop = this.handY + this.handHeight * 0.6;
            if (
                hd.y + hd.height >= handTop &&
                hd.x + hd.width > this.handX &&
                hd.x < this.handX + this.handWidth
            ) {
                this.score += 10;
                // Level up every 10 catches
                const newLevel = Math.floor(this.score / 100) + 1;
                if (newLevel > this.level) {
                    this.level = newLevel;
                    this.hotDogSpeed += 0.7; // Increase speed each level
                    this.health += 1; // Increase health by one for each level up
                    if (this.level % 2 === 0) {
                        this.handSpeed += 0.5; // Slightly increase hand speed every second level
                    }
                }
                return false;
            }
            // Remove if off screen, lose health
            if (hd.y >= this.canvasHeight) {
                this.health = Math.max(0, this.health - 1);
                this.missedCount++;
                if (this.missedCount % 2 === 0) {
                    this.showRandomMissedMsg();
                }
                if (this.health === 0 && !this.gameOver) {
                    this.endGame();
                }
                return false;
            }
            return true;
        });
    }

    endGame() {
        this.quitByEscape = false;
        this.gameOver = true;
        this.gameStarted = false;
        this.showPlayButton = true;
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.draw();
    }

    draw() {
        // Show game over message if needed
        if (this.gameOver && this.showPlayButton) {
            this.ctx.save();
            this.ctx.font = "bold 48px 'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif";
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = '#fff7e0';
            this.ctx.shadowBlur = 8;
            this.ctx.fillStyle = '#e74c3c';
            const msg = this.quitByEscape ? 'Dog quitter!' : 'Too many delicious dogs were wasted!';
            this.ctx.fillText(msg, this.canvasWidth / 2, this.canvasHeight / 2 - 40);
            this.ctx.restore();
        }
        // Draw sky blue gradient background
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        skyGradient.addColorStop(0, '#87ceeb'); // Sky blue top
        skyGradient.addColorStop(1, '#b3e0ff'); // Lighter blue bottom
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        // Draw hand (bun)
        if (this.bunLoaded && this.bunImg) {
            this.ctx.drawImage(this.bunImg, this.handX, this.handY, this.handWidth, this.handHeight);
        } else {
            this.ctx.fillStyle = '#deb887';
            this.ctx.fillRect(this.handX, this.handY, this.handWidth, this.handHeight);
        }
        // Draw hot dogs
        for (const hotDog of this.hotDogs) {
            if (this.hotDogLoaded && this.hotDogImg) {
                this.ctx.drawImage(this.hotDogImg, hotDog.x, hotDog.y, hotDog.width, hotDog.height);
            } else {
                this.ctx.fillStyle = '#c1440e';
                this.ctx.fillRect(hotDog.x, hotDog.y, hotDog.width, hotDog.height);
            }
        }
        // Draw score
        this.ctx.fillStyle = '#222';
        this.ctx.font = "bold 28px 'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif";
        this.ctx.textBaseline = 'top';
        this.ctx.shadowColor = '#fff7e0';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 2;
        this.ctx.fillText('Score: ' + this.score, 10, 20);
        this.ctx.shadowColor = '#cdaa7d';
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 3;
        // Draw level below score
        this.ctx.font = "bold 22px 'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif";
        this.ctx.fillText('Level: ' + this.level, 10, 55);
        // Draw health below level
        this.ctx.font = "bold 22px 'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif";
        this.ctx.shadowColor = '#e74c3c';
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 2;
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillText('Health: ' + this.health, 10, 85);
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        // ...existing code...
    }

    ngOnDestroy() {
        this.gameStarted = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}
