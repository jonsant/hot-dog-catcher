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
    overSound: HTMLAudioElement | null = null;
    music: HTMLAudioElement | null = null;
    bellSound: HTMLAudioElement | null = null;
    healthImg: HTMLImageElement | null = null;
    healthImgLoaded = false;
    catchSound: HTMLAudioElement | null = null;
    // Mustard splash animation state
    mustardSplashes: { x: number; y: number; vx: number; vy: number; life: number; }[] = [];
    mustardSplashActive = false;
    mustardSplashTimer: any = null;
    hotDogInHandImg: HTMLImageElement | null = null;
    hotDogInHandLoaded = false;
    handHasHotDog = false;
    catchStreak = 0;
    positiveMsgList = [
        "Nice work!",
        "You're getting good at this!",
        "So much deliciousness!",
        "Keep it up!"
    ];
    lastPositiveMsgIdx: number | null = null;
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
        "Such a hot dog waster!!!!!!",
        "You're wasting delicious dogs!!!",
        "You need practice, for sure!"
    ];

    ngOnInit() {
        // Load game over sound
        this.overSound = new Audio('assets/over.wav');
        this.overSound.volume = 0.18;
        this.overSound.load();
        // Pause/resume music on tab visibility change
        document.addEventListener('visibilitychange', () => {
            if (this.music) {
                if (document.hidden) {
                    this.music.pause();
                } else if (this.gameStarted && !this.gameOver) {
                    this.music.play();
                }
            }
        });
        // Load background music
        this.music = new Audio('assets/music.mp3');
        this.music.loop = true;
        this.music.volume = 0.45;
        this.music.load();
        // Extra reliability: restart music on end
        this.music.addEventListener('ended', () => {
            this.music!.currentTime = 0;
            this.music!.play();
        });
        // Load bell sound
        this.bellSound = new Audio('assets/bell.wav');
        this.bellSound.load();
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
        // Load hot dog image (falling hot dogs)
        this.hotDogImg = new Image();
        this.hotDogImg.src = 'assets/dog.png';
        this.hotDogImg.onload = () => {
            this.hotDogLoaded = true;
            this.draw();
        };
        // Load hotdog-in-hand image
        this.hotDogInHandImg = new Image();
        this.hotDogInHandImg.src = 'assets/hotdog.png';
        this.hotDogInHandImg.onload = () => {
            this.hotDogInHandLoaded = true;
            this.draw();
        };

        // Load health icon
        this.healthImg = new Image();
        this.healthImg.src = 'assets/health.png';
        this.healthImg.onload = () => {
            this.healthImgLoaded = true;
            this.draw();
        };

        // Load catch sound
        this.catchSound = new Audio('assets/catch.wav');
        this.catchSound.load();

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
        // Play background music at low volume
        if (this.music) {
            this.music.currentTime = 0;
            this.music.volume = 0.60;
            this.music.play();
        }
        // Play bell sound
        if (this.bellSound) {
            this.bellSound.currentTime = 0;
            this.bellSound.volume = 0.60;
            this.bellSound.play();
        }
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
                this.hotDogs = []; // Remove all hot dogs from the screen
                this.score = 0;
                this.level = 1;
                this.health = 5;
                // Stop music
                if (this.music) {
                    this.music.pause();
                    this.music.currentTime = 0;
                }
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
        // Move hot dogs
        for (const hotDog of this.hotDogs) {
            hotDog.y += hotDog.speed;
        }
        // Check for catches and misses
        this.hotDogs = this.hotDogs.filter((hd: any) => {
            const handTop = this.handY + this.handHeight * 0.6;
            if (
                hd.y + hd.height >= handTop &&
                hd.x + hd.width > this.handX &&
                hd.x < this.handX + this.handWidth
            ) {
                this.score += 10;
                this.catchStreak++;
                if (this.catchStreak > 0 && this.catchStreak % 5 === 0) {
                    this.showRandomPositiveMsg();
                }
                // Show hot dog in hand after catch
                this.handHasHotDog = true;
                // Start mustard splash animation
                this.startMustardSplash();
                // Play catch sound
                if (this.catchSound) {
                    this.catchSound.currentTime = 0;
                    this.catchSound.play();
                }
                // Level up every 10 catches
                const newLevel = Math.floor(this.score / 100) + 1;
                if (newLevel > this.level) {
                    this.level = newLevel;
                    // Increase hot dog speed more rapidly as level increases
                    // Exponential or quadratic scaling for more challenge
                    this.hotDogSpeed += 0.7 + 0.2 * (this.level - 1) + 0.05 * Math.pow(this.level - 1, 2);
                    // Optionally, decrease interval for more frequent hot dogs
                    this.hotDogInterval = Math.max(400, this.hotDogInterval - 60 - 5 * (this.level - 1));
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
                this.catchStreak = 0;
                // Remove hot dog from hand on miss
                this.handHasHotDog = false;
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

    startMustardSplash() {
        // Create splash particles (e.g. 8)
        const splashCount = 8;
        const centerX = this.handX + this.handWidth / 2;
        const baseY = this.handY + this.handHeight * 0.3;
        this.mustardSplashes = [];
        for (let i = 0; i < splashCount; i++) {
            const angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2; // upward, spread
            const speed = 10 + Math.random() * 4; // Increased speed
            this.mustardSplashes.push({
                x: centerX,
                y: baseY,
                vx: Math.cos(angle) * speed,
                vy: -Math.abs(Math.sin(angle) * speed),
                life: 0
            });
        }
        this.mustardSplashActive = true;
        if (this.mustardSplashTimer) clearTimeout(this.mustardSplashTimer);
        // End splash after 400ms
        this.mustardSplashTimer = setTimeout(() => {
            this.mustardSplashActive = false;
        }, 400);
    }

    showRandomPositiveMsg() {
        if (this.missedMsgTimeout) {
            clearTimeout(this.missedMsgTimeout);
        }
        let idx: number;
        do {
            idx = Math.floor(Math.random() * this.positiveMsgList.length);
        } while (this.positiveMsgList.length > 1 && idx === this.lastPositiveMsgIdx);
        this.lastPositiveMsgIdx = idx;
        this.missedMsg = this.positiveMsgList[idx];
        this.missedMsgAngle = (Math.random() * 20 - 10);
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

    endGame() {
        // Play game over sound
        if (this.overSound) {
            this.overSound.currentTime = 0;
            this.overSound.volume = 0.10;
            this.overSound.play();
        }
        // Stop music if health is 0 (game over)
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
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
        // Draw hand (bun or hot dog in bun)
        if (this.handHasHotDog && this.hotDogInHandLoaded && this.hotDogInHandImg) {
            // Draw hotdog.png just a tiny bit larger than before
            const hdW = this.handWidth * 1.22;
            const hdH = this.handHeight * 0.86;
            const hdX = this.handX - (hdW - this.handWidth) / 2;
            const hdY = this.handY + (this.handHeight - hdH) / 2;
            this.ctx.drawImage(this.hotDogInHandImg, hdX, hdY, hdW, hdH);
        } else if (this.bunLoaded && this.bunImg) {
            this.ctx.drawImage(this.bunImg, this.handX, this.handY, this.handWidth, this.handHeight);
        } else {
            this.ctx.fillStyle = '#deb887';
            this.ctx.fillRect(this.handX, this.handY, this.handWidth, this.handHeight);
        }

        // Mustard splash animation (draw after hand)
        if (this.mustardSplashActive && this.mustardSplashes.length > 0) {
            for (const p of this.mustardSplashes) {
                // Animate
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.7; // gravity
                p.life++;
                // Draw splash (yellow arc or ellipse)
                this.ctx.save();
                this.ctx.globalAlpha = Math.max(0, 1 - p.life / 18);
                this.ctx.fillStyle = '#e6b800';
                this.ctx.beginPath();
                this.ctx.ellipse(p.x, p.y, 16, 7, Math.random() * Math.PI, 0, 2 * Math.PI); // Larger ellipse
                this.ctx.fill();
                this.ctx.restore();
            }
        }
        // Draw hot dogs only if game is not over
        if (!this.gameOver) {
            for (const hotDog of this.hotDogs) {
                if (this.hotDogLoaded && this.hotDogImg) {
                    this.ctx.drawImage(this.hotDogImg, hotDog.x, hotDog.y, hotDog.width, hotDog.height);
                } else {
                    this.ctx.fillStyle = '#c1440e';
                    this.ctx.fillRect(hotDog.x, hotDog.y, hotDog.width, hotDog.height);
                }
            }
        }
        // Draw score
        this.ctx.fillStyle = '#222';
        this.ctx.font = "bold 28px 'Baloo 2', 'Fredoka', 'Quicksand', 'Arial Rounded MT Bold', Arial, sans-serif";
        this.ctx.textBaseline = 'top';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText('Score: ' + this.score, 10, 20);
        // Draw level below score
        this.ctx.font = "bold 22px 'Baloo 2', 'Fredoka', 'Quicksand', 'Arial Rounded MT Bold', Arial, sans-serif";
        this.ctx.fillText('Level: ' + this.level, 10, 55);
        // Draw health icon and value below level
        const healthIconY = 85;
        if (this.healthImgLoaded && this.healthImg) {
            this.ctx.drawImage(this.healthImg, 10, healthIconY, 28, 28);
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = "bold 22px 'Baloo 2', 'Fredoka', 'Quicksand', 'Arial Rounded MT Bold', Arial, sans-serif";
            this.ctx.textBaseline = 'top';
            this.ctx.fillText('x ' + this.health, 44, healthIconY + 3);
        } else {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = "bold 22px 'Baloo 2', 'Fredoka', 'Quicksand', 'Arial Rounded MT Bold', Arial, sans-serif";
            this.ctx.textBaseline = 'top';
            this.ctx.fillText('Health: ' + this.health, 10, healthIconY);
        }
        // ...existing code...
    }

    ngOnDestroy() {
        this.gameStarted = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}
