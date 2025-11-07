// PomPomFocus - Cute Pomodoro Timer JavaScript

class PomPomFocus {
    constructor() {
        this.workTime = 25; // minutes
        this.breakTime = 5; // minutes
        this.currentTime = this.workTime * 60; // seconds
        this.isRunning = false;
        this.isBreak = false;
        this.interval = null;
        this.volume = 0.5;
        
        // Statistics
        this.stats = {
            totalSessions: 0,
            totalFocusTime: 0, // in minutes
            todaySessions: 0,
            currentStreak: 0,
            lastActiveDate: null,
            sessionHistory: []
        };
        
        // Motivational messages
        this.workMessages = [
            "Ready to focus? 🌟",
            "You've got this! 💪",
            "Stay focused! 🎯",
            "Almost there! 🚀",
            "Keep going! ⭐",
            "You're doing great! 🌈",
            "Focus mode activated! 🧠",
            "Productivity time! 📚"
        ];
        
        this.breakMessages = [
            "Time to relax! 🌸",
            "Take a deep breath! 🌬️",
            "Refresh yourself! 💧",
            "You earned this break! 🎉",
            "Chill time! ☕",
            "Recharge your energy! 🔋",
            "Stretch and relax! 🧘",
            "Break time fun! 🎮"
        ];
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.loadStats();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStats();
        this.updateCurrentTime();
        this.setupAudio();
        this.initAOS();
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Update current time every second
        setInterval(() => this.updateCurrentTime(), 1000);
    }
    
    initAOS() {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }
    
    setupEventListeners() {
        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // Settings
        document.getElementById('workDuration').addEventListener('change', (e) => {
            this.workTime = parseInt(e.target.value);
            if (!this.isRunning && !this.isBreak) {
                this.currentTime = this.workTime * 60;
                this.updateDisplay();
            }
        });
        
        document.getElementById('breakDuration').addEventListener('change', (e) => {
            this.breakTime = parseInt(e.target.value);
            if (!this.isRunning && this.isBreak) {
                this.currentTime = this.breakTime * 60;
                this.updateDisplay();
            }
        });
        
        // Volume control
        document.getElementById('volumeControl').addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            document.getElementById('volumeValue').textContent = `${e.target.value}%`;
            this.updateAudioVolume();
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Clear data
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());
    }
    
    setupAudio() {
        // Create cute sounds using Web Audio API
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create start sound (cute beep)
        this.startSound = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
        
        // Create completion sound (cute melody)
        this.completeSound = () => {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (higher)
            const duration = 0.15;
            
            notes.forEach((frequency, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + duration);
                }, index * duration * 1000);
            });
        };
    }
    
    updateAudioVolume() {
        // Volume is updated in real-time when sounds are played
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        
        this.startSound();
        this.updateMotivationalMessage();
        
        this.interval = setInterval(() => this.tick(), 1000);
    }
    
    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
        
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    }
    
    reset() {
        this.pause();
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        this.updateDisplay();
        this.updateMotivationalMessage();
    }
    
    tick() {
        this.currentTime--;
        
        if (this.currentTime < 0) {
            this.completeSession();
        } else {
            this.updateDisplay();
            
            // Update motivational message every 30 seconds
            if (this.currentTime % 30 === 0) {
                this.updateMotivationalMessage();
            }
        }
    }
    
    completeSession() {
        this.pause();
        this.completeSound();
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const message = this.isBreak ? 'Break time is over! Ready to work?' : 'Great work! Time for a break!';
            new Notification('PomPomFocus', {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>'
            });
        }
        
        // Update statistics
        if (!this.isBreak) {
            this.stats.totalSessions++;
            this.stats.totalFocusTime += this.workTime;
            this.stats.todaySessions++;
            this.stats.sessionHistory.push({
                date: new Date().toISOString(),
                duration: this.workTime,
                type: 'work'
            });
            this.updateStreak();
        }
        
        this.saveStats();
        this.updateStats();
        
        // Switch modes
        this.isBreak = !this.isBreak;
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        
        // Update UI
        this.updateModeDisplay();
        this.updateDisplay();
        this.updateMotivationalMessage();
        
        // Auto-start next session after 3 seconds
        setTimeout(() => {
            if (!this.isRunning) {
                this.start();
            }
        }, 3000);
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timerDisplay').textContent = display;
        
        // Update progress ring
        const totalTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        const progress = (totalTime - this.currentTime) / totalTime;
        const circumference = 2 * Math.PI * 110;
        const offset = circumference - (progress * circumference);
        
        document.getElementById('progressRing').style.strokeDashoffset = offset;
        
        // Add pulse animation when less than 10 seconds
        if (this.currentTime > 0 && this.currentTime <= 10) {
            document.querySelector('.timer-circle').classList.add('pulse');
        } else {
            document.querySelector('.timer-circle').classList.remove('pulse');
        }
    }
    
    updateModeDisplay() {
        const modeBadge = document.getElementById('modeBadge');
        const timerCard = document.querySelector('.timer-card');
        
        if (this.isBreak) {
            modeBadge.innerHTML = '<i class="bi bi-cup-hot-fill"></i> Break Time';
            modeBadge.classList.add('break-mode');
            timerCard.classList.add('break-mode');
        } else {
            modeBadge.innerHTML = '<i class="bi bi-laptop"></i> Work Time';
            modeBadge.classList.remove('break-mode');
            timerCard.classList.remove('break-mode');
        }
    }
    
    updateMotivationalMessage() {
        const messages = this.isBreak ? this.breakMessages : this.workMessages;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        document.getElementById('motivationalMessage').textContent = randomMessage;
    }
    
    updateCurrentTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('currentTime').textContent = now.toLocaleDateString('en-US', options);
    }
    
    updateStats() {
        document.getElementById('totalSessions').textContent = this.stats.totalSessions;
        document.getElementById('todaySessions').textContent = this.stats.todaySessions;
        document.getElementById('currentStreak').textContent = this.stats.currentStreak;
        
        // Format focus time
        const hours = Math.floor(this.stats.totalFocusTime / 60);
        const minutes = this.stats.totalFocusTime % 60;
        document.getElementById('totalFocusTime').textContent = `${hours}h ${minutes}m`;
    }
    
    updateStreak() {
        const today = new Date().toDateString();
        const lastActive = this.stats.lastActiveDate ? new Date(this.stats.lastActiveDate).toDateString() : null;
        
        if (lastActive === today) {
            // Already active today, no change to streak
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActive === yesterday.toDateString()) {
            // Consecutive day, increment streak
            this.stats.currentStreak++;
        } else {
            // Missed a day or first time, reset streak
            this.stats.currentStreak = 1;
        }
        
        this.stats.lastActiveDate = new Date().toISOString();
    }
    
    toggleTheme() {
        const container = document.getElementById('appContainer');
        const themeBtn = document.getElementById('themeToggle');
        
        container.classList.toggle('pink-theme');
        const isPink = container.classList.contains('pink-theme');
        
        themeBtn.innerHTML = isPink ? 
            '<i class="bi bi-palette-fill"></i> Light Mode' : 
            '<i class="bi bi-palette-fill"></i> Pink Mode';
        
        localStorage.setItem('pompomfocus-theme', isPink ? 'pink' : 'light');
    }
    
    loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('pompomfocus-theme');
        if (savedTheme === 'pink') {
            document.getElementById('appContainer').classList.add('pink-theme');
            document.getElementById('themeToggle').innerHTML = '<i class="bi bi-palette-fill"></i> Light Mode';
        }
        
        // Load volume
        const savedVolume = localStorage.getItem('pompomfocus-volume');
        if (savedVolume) {
            this.volume = parseFloat(savedVolume);
            document.getElementById('volumeControl').value = this.volume * 100;
            document.getElementById('volumeValue').textContent = `${Math.round(this.volume * 100)}%`;
        }
        
        // Load timer settings
        const savedWorkTime = localStorage.getItem('pompomfocus-work-time');
        if (savedWorkTime) {
            this.workTime = parseInt(savedWorkTime);
            document.getElementById('workDuration').value = this.workTime;
            this.currentTime = this.workTime * 60;
        }
        
        const savedBreakTime = localStorage.getItem('pompomfocus-break-time');
        if (savedBreakTime) {
            this.breakTime = parseInt(savedBreakTime);
            document.getElementById('breakDuration').value = this.breakTime;
        }
    }
    
    saveSettings() {
        localStorage.setItem('pompomfocus-volume', this.volume);
        localStorage.setItem('pompomfocus-work-time', this.workTime);
        localStorage.setItem('pompomfocus-break-time', this.breakTime);
    }
    
    loadStats() {
        const savedStats = localStorage.getItem('pompomfocus-stats');
        if (savedStats) {
            const parsed = JSON.parse(savedStats);
            this.stats = { ...this.stats, ...parsed };
            
            // Check if we need to reset today's sessions
            const today = new Date().toDateString();
            const lastActive = this.stats.lastActiveDate ? new Date(this.stats.lastActiveDate).toDateString() : null;
            
            if (lastActive !== today) {
                this.stats.todaySessions = 0;
                
                // Check if streak is broken
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastActive !== yesterday.toDateString()) {
                    this.stats.currentStreak = 0;
                }
            }
        }
    }
    
    saveStats() {
        localStorage.setItem('pompomfocus-stats', JSON.stringify(this.stats));
    }
    
    clearData() {
        if (confirm('Are you sure you want to clear all data? This will reset your statistics and cannot be undone.')) {
            this.stats = {
                totalSessions: 0,
                totalFocusTime: 0,
                todaySessions: 0,
                currentStreak: 0,
                lastActiveDate: null,
                sessionHistory: []
            };
            
            this.saveStats();
            this.updateStats();
            
            // Show success message
            const btn = document.getElementById('clearDataBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check-circle"></i> Data Cleared!';
            btn.classList.add('success');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('success');
            }, 2000);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PomPomFocus();
});

// Handle visibility change to pause timer when tab is not visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.pompomfocus && window.pompomfocus.isRunning) {
        // Optional: pause timer when tab is not visible
        // window.pompomfocus.pause();
    }
});