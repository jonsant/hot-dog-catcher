import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';

interface HotDog {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    dx?: number; // for diagonal movement if hit by plane
}

@Component({
    selector: 'app-hot-dog-catcher',
    templateUrl: './hot-dog-catcher.component.html',
    styleUrls: ['./hot-dog-catcher.component.scss']
})
export class HotDogCatcherComponent implements OnInit {

    // Plane variables
    planeImg: HTMLImageElement | null = null;
    planeImgLoaded = false;
    planeActive = false;
    planeX = 0;
    planeY = 0;
    planeSpeed = 0;
    planeWidth = 100;
    planeHeight = 40;
    nextPlaneTime = 0;

    // Plane2 variables
    plane2Img: HTMLImageElement | null = null;
    plane2ImgLoaded = false;
    plane2Active = false;
    plane2X = 0;
    plane2Y = 0;
    plane2Speed = 0;
    plane2Width = 100;
    plane2Height = 40;
    nextPlane2Time = 0;



    stopGame() {
        // Cancel animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // Stop music
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
        // Reset all state
        this.gameStarted = false;
        this.gameOver = false;
        this.showPlayButton = true;
        this.paused = false;
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
        this.handHasHotDog = false;
        this.mustardSplashActive = false;
        this.mustardSplashes = [];
        this.leftPressed = false;
        this.rightPressed = false;
        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        // Redraw background
        this.draw();
    }
    paused = false;

    togglePause() {
        if (!this.gameStarted || this.gameOver) return;
        this.paused = !this.paused;
        if (this.paused) {
            if (this.music) this.music.pause();
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        } else {
            if (this.music && this.audioEnabled) this.music.play();
            this.gameLoop();
        }
    }
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
    handSpeed = 10; // Increased speed for faster keyboard movement

    // Store the base hand speed for keyboard movement
    readonly BASE_HAND_SPEED = 10;

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
    audioOnImg: HTMLImageElement | null = null;
    audioOnImgLoaded = false;
    audioOffImg: HTMLImageElement | null = null;
    audioOffImgLoaded = false;

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

    // Audio control
    audioEnabled = false; // Audio is off by default
    audioOnIconRect = { x: 2, y: 105, width: 44, height: 44 };

    ngOnInit() {
        // Load plane image
        this.planeImg = new Image();
        this.planeImg.src = 'assets/plane.png';
        this.planeImg.onload = () => {
            this.planeImgLoaded = true;
        };
        // Load plane2 image
        this.plane2Img = new Image();
        this.plane2Img.src = 'assets/plane2.png';
        this.plane2Img.onload = () => {
            this.plane2ImgLoaded = true;
        };
        // Set initial next plane time
        this.scheduleNextPlane();
        // Set initial next plane2 time
        this.scheduleNextPlane2();
        // Load game over sound
        this.overSound = new Audio('assets/over.wav');
        this.overSound.volume = 0.18;
        this.overSound.load();
        // Pause/resume music on tab visibility change
        document.addEventListener('visibilitychange', () => {
            if (this.music) {
                if (document.hidden) {
                    this.music.pause();
                } else if (this.gameStarted && !this.gameOver && this.audioEnabled) {
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

        // Unlock audio context for browsers that block autoplay
        const unlockAudio = () => {
            if (this.music) {
                this.music.muted = true;
                const p = this.music.play();
                if (p && typeof p.then === 'function') {
                    p.then(() => {
                        this.music!.pause();
                        this.music!.currentTime = 0;
                        this.music!.muted = false;
                    }).catch(() => {
                        // ignore
                    });
                } else {
                    this.music!.pause();
                    this.music!.currentTime = 0;
                    this.music!.muted = false;
                }
            }
            window.removeEventListener('pointerdown', unlockAudio, true);
            window.removeEventListener('keydown', unlockAudio, true);
        };
        window.addEventListener('pointerdown', unlockAudio, true);
        window.addEventListener('keydown', unlockAudio, true);
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

        // Load audio on icon
        this.audioOnImg = new Image();
        this.audioOnImg.src = 'assets/audioon.png';
        this.audioOnImg.onload = () => {
            this.audioOnImgLoaded = true;
            this.draw();
        };
        // Load audio off icon
        this.audioOffImg = new Image();
        this.audioOffImg.src = 'assets/audiooff.png';
        this.audioOffImg.onload = () => {
            this.audioOffImgLoaded = true;
            this.draw();
        };

        // Touch event listeners for mobile/touchscreen support
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
        // Listen for clicks on the canvas to toggle audio
        this.canvasRef.nativeElement.addEventListener('click', this.handleAudioIconClick.bind(this));
        // Listen for touchend on the canvas to toggle audio (for mobile/touch screens)
        this.canvasRef.nativeElement.addEventListener('touchend', (event: TouchEvent) => {
            if (event.changedTouches.length > 0) {
                const touch = event.changedTouches[0];
                // Synthesize a MouseEvent-like object for handleAudioIconClick
                const rect = this.canvasRef.nativeElement.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                // Only trigger if touch is within the audio icon bounds
                const { x: iconX, y: iconY, width, height } = this.audioOnIconRect;
                if (x >= iconX && x <= iconX + width && y >= iconY && y <= iconY + height) {
                    // Create a synthetic MouseEvent for compatibility
                    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
                    this.handleAudioIconClick(fakeEvent);
                }
            }
        });
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
        if (this.music && this.audioEnabled) {
            this.music.pause();
            this.music.currentTime = 0;
            this.music.load();
            this.music.volume = 0.60;
            const playPromise = this.music.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.catch(() => {
                    // Autoplay was prevented; show a message or ignore
                });
            }
        }
        // Play bell sound
        if (this.bellSound && this.audioEnabled) {
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
        this.handSpeed = this.BASE_HAND_SPEED;
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
        // Reset plane
        this.planeActive = false;
        this.scheduleNextPlane();
        // Reset plane2
        this.plane2Active = false;
        if (this.level >= 3) {
            this.scheduleNextPlane2();
        } else {
            this.nextPlane2Time = 0;
        }
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
                this.hotDogs = [];
                this.score = 0;
                this.level = 1;
                this.health = 5;
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
        } else if (event.key === ' ' || event.code === 'Space') {
            // Spacebar toggles pause/play
            if (this.gameStarted && !this.gameOver) {
                this.togglePause();
                event.preventDefault();
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
        // Use visualViewport height if available for better mobile support
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        this.canvasWidth = window.innerWidth;
        // Add a bottom margin so the hand is always visible above browser toolbars (especially on mobile)
        const bottomMargin = 32; // px, adjust as needed
        this.canvasHeight = viewportHeight - 60 - bottomMargin;
        if (this.canvasRef && this.canvasRef.nativeElement) {
            this.canvasRef.nativeElement.width = this.canvasWidth;
            this.canvasRef.nativeElement.height = this.canvasHeight;
        }
        // Adjust hand position to bottom, ensuring it's always fully visible
        this.handY = this.canvasHeight - this.handHeight - 8; // 8px padding from bottom
        // Ensure hand stays in bounds if resized
        this.handX = Math.max(0, Math.min(this.handX, this.canvasWidth - this.handWidth));
        // Adjust plane Y position if needed
        this.planeY = Math.max(0, Math.floor(this.canvasHeight * 0.08));
        // Adjust plane2 Y position (middle of screen)
        this.plane2Y = Math.floor(this.canvasHeight * 0.5) - Math.floor(this.plane2Height / 2);
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
        if (!this.gameStarted || this.paused) return;
        const now = performance.now();
        if (now - this.lastHotDogTime > this.hotDogInterval) {
            this.spawnHotDog();
            this.lastHotDogTime = now;
        }
        // Plane logic
        this.updatePlane(now);
        this.updatePlane2(now);
        this.update();
        this.draw();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    // Plane2 logic
    scheduleNextPlane2() {
        // Only schedule plane2 if level >= 3
        if (this.level < 3) {
            this.nextPlane2Time = 0;
            return;
        }
        // Plane2 appears at random intervals, similar scaling as plane
        const minBase = 4000; // ms
        const maxBase = 9000; // ms
        const levelFactor = Math.min(this.level, 10);
        const minInterval = Math.max(1500, minBase - levelFactor * 250);
        const maxInterval = Math.max(3000, maxBase - levelFactor * 600);
        const interval = minInterval + Math.random() * (maxInterval - minInterval);
        this.nextPlane2Time = performance.now() + interval;
    }

    updatePlane2(now: number) {
        if (this.level < 3) {
            this.plane2Active = false;
            return;
        }
        if (!this.plane2Active && now > this.nextPlane2Time && this.plane2ImgLoaded) {
            // Always start plane2 from left, moving right
            this.plane2Active = true;
            this.plane2Speed = 2.5 + Math.random() * 1.5;
            this.plane2Width = 100 + Math.random() * 40;
            this.plane2Height = 60 + Math.random() * 18;
            this.plane2Y = Math.floor(this.canvasHeight * 0.5) - Math.floor(this.plane2Height / 2);
            this.plane2X = -this.plane2Width;
        }
        if (this.plane2Active) {
            this.plane2X += this.plane2Speed;
            // If plane2 is off screen, deactivate and schedule next
            if (this.plane2X > this.canvasWidth) {
                this.plane2Active = false;
                this.scheduleNextPlane2();
            }
        }
    }

    // Plane logic
    scheduleNextPlane() {
        // Plane appears more frequently as level increases
        // Minimum interval: 1s, maximum interval: 7s, scales with level
        const minBase = 3000; // ms
        const maxBase = 7000; // ms
        const levelFactor = Math.min(this.level, 10); // Cap effect at level 10
        const minInterval = Math.max(1000, minBase - levelFactor * 200); // never less than 1s
        const maxInterval = Math.max(2000, maxBase - levelFactor * 500); // never less than 2s
        const interval = minInterval + Math.random() * (maxInterval - minInterval);
        this.nextPlaneTime = performance.now() + interval;
    }

    updatePlane(now: number) {
        if (!this.planeActive && now > this.nextPlaneTime && this.planeImgLoaded) {
            // Always start plane from right, moving left
            this.planeActive = true;
            this.planeSpeed = - (3 + Math.random() * 2); // Always negative for right-to-left
            this.planeWidth = 100 + Math.random() * 40;
            this.planeHeight = 60 + Math.random() * 18;
            this.planeY = Math.max(0, Math.floor(this.canvasHeight * 0.08));
            this.planeX = this.canvasWidth;
        }
        if (this.planeActive) {
            this.planeX += this.planeSpeed;
            // If plane is off screen, deactivate and schedule next
            if ((this.planeSpeed > 0 && this.planeX > this.canvasWidth) || (this.planeSpeed < 0 && this.planeX < -this.planeWidth)) {
                this.planeActive = false;
                this.scheduleNextPlane();
            }
        }
    }

    update() {
        // Smooth hand movement
        if (this.leftPressed) {
            this.handX = Math.max(0, this.handX - this.handSpeed);
        }
        if (this.rightPressed) {
            this.handX = Math.min(this.canvasWidth - this.handWidth, this.handX + this.handSpeed);
        }
        // Move hot dogs (check for plane collision and bounce off edges)
        for (const hotDog of this.hotDogs) {
            if (typeof hotDog.dx === 'number') {
                hotDog.x += hotDog.dx;
                hotDog.y += hotDog.speed;
                // Bounce off left edge
                if (hotDog.x < 0) {
                    hotDog.x = 0;
                    hotDog.dx = Math.abs(hotDog.dx);
                }
                // Bounce off right edge
                if (hotDog.x + hotDog.width > this.canvasWidth) {
                    hotDog.x = this.canvasWidth - hotDog.width;
                    hotDog.dx = -Math.abs(hotDog.dx);
                }
            } else {
                hotDog.y += hotDog.speed;
                // Check for collision with plane
                if (
                    this.planeActive &&
                    this.planeImgLoaded &&
                    hotDog.y < this.planeY + this.planeHeight &&
                    hotDog.y + hotDog.height > this.planeY &&
                    hotDog.x < this.planeX + this.planeWidth &&
                    hotDog.x + hotDog.width > this.planeX
                ) {
                    // Start falling diagonally (random left or right)
                    hotDog.dx = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2);
                    // Optionally increase fall speed a bit
                    hotDog.speed += 1.5;
                }
                // Check for collision with plane2 (left-to-right)
                if (
                    this.plane2Active &&
                    this.plane2ImgLoaded &&
                    hotDog.y < this.plane2Y + this.plane2Height &&
                    hotDog.y + hotDog.height > this.plane2Y &&
                    hotDog.x < this.plane2X + this.plane2Width &&
                    hotDog.x + hotDog.width > this.plane2X
                ) {
                    hotDog.dx = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2);
                    hotDog.speed += 1.5;
                }
            }
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
                if (this.catchSound && this.audioEnabled) {
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
                    // Increase hand speed a bit every level
                    this.handSpeed = this.BASE_HAND_SPEED + (this.level - 1) * 1.2;
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
        if (this.overSound && this.audioEnabled) {
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

    handleAudioIconClick(event: MouseEvent) {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const { x: iconX, y: iconY, width, height } = this.audioOnIconRect;
        if (
            x >= iconX && x <= iconX + width &&
            y >= iconY && y <= iconY + height
        ) {
            const wasDisabled = !this.audioEnabled;
            this.audioEnabled = !this.audioEnabled;
            this.draw();
            // Only play music if enabling audio AND game has started and not over
            if (this.audioEnabled && wasDisabled && this.music && this.gameStarted && !this.gameOver) {
                this.music.pause();
                this.music.currentTime = 0;
                this.music.load();
                this.music.volume = 0.60;
                const playPromise = this.music.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise.catch(() => {
                        // Autoplay was prevented; show a message or ignore
                    });
                }
            }
            // If audio is now disabled, stop music
            if (!this.audioEnabled && !wasDisabled && this.music) {
                this.music.pause();
                this.music.currentTime = 0;
            }
        }
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

        // Draw plane if active
        if (this.planeActive && this.planeImgLoaded && this.planeImg) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.92;
            this.ctx.drawImage(
                this.planeImg,
                this.planeX,
                this.planeY,
                this.planeWidth,
                this.planeHeight
            );
            this.ctx.restore();
        }
        // Draw plane2 if active
        if (this.plane2Active && this.plane2ImgLoaded && this.plane2Img) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.92;
            this.ctx.drawImage(
                this.plane2Img,
                this.plane2X,
                this.plane2Y,
                this.plane2Width,
                this.plane2Height
            );
            this.ctx.restore();
        }
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
        // Draw audio icon below health
        const audioIconY = healthIconY + 20;
        this.audioOnIconRect.y = audioIconY; // keep rect in sync if layout changes
        this.audioOnIconRect.x = 2; // keep rect in sync if layout changes
        if (this.audioEnabled) {
            if (this.audioOnImgLoaded && this.audioOnImg) {
                this.ctx.globalAlpha = 1.0;
                this.ctx.drawImage(this.audioOnImg, 2, audioIconY, 44, 44);
                this.ctx.globalAlpha = 1.0;
            }
        } else {
            // Only show audioOff icon if play button is not visible (game has started at least once)
            if (!this.showPlayButton) {
                if (this.audioOffImgLoaded && this.audioOffImg) {
                    this.ctx.globalAlpha = 1.0;
                    this.ctx.drawImage(this.audioOffImg, 2, audioIconY, 44, 44);
                    this.ctx.globalAlpha = 1.0;
                } else if (this.audioOnImgLoaded && this.audioOnImg) {
                    // fallback: show audioOn icon faded if audioOff not loaded
                    this.ctx.globalAlpha = 0.4;
                    this.ctx.drawImage(this.audioOnImg, 2, audioIconY, 44, 44);
                    this.ctx.globalAlpha = 1.0;
                }
            }
        }
    }

    ngOnDestroy() {
        this.gameStarted = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}
