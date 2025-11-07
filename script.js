// PomPomFocus - Modern Cute Pomodoro Timer JavaScript

class PomPomFocus {
    constructor() {
        this.workTime = 25; // minutes
        this.breakTime = 5; // minutes
        this.currentTime = this.workTime * 60; // seconds
        this.isRunning = false;
        this.isBreak = false;
        this.interval = null;
        this.volume = 0.5;
        this.sessionNumber = 1;
        this.autoStart = true;
        this.notificationsEnabled = true;
        this.currentPeriod = 'today';
        
        // Statistics
        this.stats = {
            totalSessions: 0,
            totalFocusTime: 0, // in minutes
            todaySessions: 0,
            currentStreak: 0,
            lastActiveDate: null,
            sessionHistory: [],
            weeklyData: this.generateWeeklyData()
        };
        
        // Achievements
        this.achievements = {
            firstTimer: { unlocked: false, title: "First Timer", desc: "Complete your first session", icon: "🌟" },
            onFire: { unlocked: false, title: "On Fire", desc: "7 day streak", icon: "🔥" },
            speedFocus: { unlocked: false, title: "Speed Focus", desc: "Complete 10 sessions", icon: "⚡" },
            focusMaster: { unlocked: false, title: "Focus Master", desc: "100 sessions", icon: "👑" },
            earlyBird: { unlocked: false, title: "Early Bird", desc: "Complete a session before 9 AM", icon: "🌅" },
            nightOwl: { unlocked: false, title: "Night Owl", desc: "Complete a session after 10 PM", icon: "🦉" },
            marathon: { unlocked: false, title: "Marathon", desc: "Complete 4 sessions in one day", icon: "🏃" },
            consistent: { unlocked: false, title: "Consistent", desc: "Use the app for 7 days straight", icon: "📅" }
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
            "Productivity time! 📚",
            "Deep work in progress! 🔥",
            "Concentrate and conquer! 👑"
        ];
        
        this.breakMessages = [
            "Time to relax! 🌸",
            "Take a deep breath! 🌬️",
            "Refresh yourself! 💧",
            "You earned this break! 🎉",
            "Chill time! ☕",
            "Recharge your energy! 🔋",
            "Stretch and relax! 🧘",
            "Break time fun! 🎮",
            "Rest and recharge! 🌙",
            "You deserve this pause! 💝"
        ];
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.loadStats();
        this.loadAchievements();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStats();
        this.updateSessionNumber();
        this.updateCurrentTime();
        this.setupAudio();
        this.initAOS();
        this.checkAchievements();
        this.updateWeeklyChart();
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Update current time every second
        setInterval(() => this.updateCurrentTime(), 1000);
        
        // Save data every minute
        setInterval(() => this.saveData(), 60000);
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
        document.getElementById('skipBtn').addEventListener('click', () => this.skipSession());
        
        // Mode tabs
        document.getElementById('workTab').addEventListener('click', () => this.switchMode('work'));
        document.getElementById('breakTab').addEventListener('click', () => this.switchMode('break'));
        
        // Quick duration buttons
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const time = e.target.dataset.time;
                if (time !== 'custom') {
                    this.setQuickDuration(parseInt(time));
                }
            });
        });
        
        // Settings buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                const isWork = e.target.closest('.setting-group').querySelector('.setting-label i').classList.contains('bi-laptop');
                
                if (isWork) {
                    this.workTime = minutes;
                    document.getElementById('workDuration').value = minutes;
                    if (!this.isRunning && !this.isBreak) {
                        this.currentTime = this.workTime * 60;
                        this.updateDisplay();
                    }
                } else {
                    this.breakTime = minutes;
                    document.getElementById('breakDuration').value = minutes;
                    if (!this.isRunning && this.isBreak) {
                        this.currentTime = this.breakTime * 60;
                        this.updateDisplay();
                    }
                }
                
                this.updateTimeButtons();
                this.saveSettings();
            });
        });
        
        // Volume control
        document.getElementById('volumeControl').addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            document.getElementById('volumeValue').textContent = `${e.target.value}%`;
            this.updateVolumeIcon();
            this.updateAudioVolume();
        });
        
        // Toggle switches
        document.getElementById('notificationToggle').addEventListener('change', (e) => {
            this.notificationsEnabled = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('autoStartToggle').addEventListener('change', (e) => {
            this.autoStart = e.target.checked;
            this.saveSettings();
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Stats period buttons
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentPeriod = e.target.dataset.period;
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateStats();
            });
        });
        
        // Clear data and export buttons
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        
        // Settings toggle (mobile)
        const settingsToggle = document.getElementById('settingsToggle');
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => {
                document.querySelector('.settings-panel').scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.isRunning ? this.pause() : this.start();
            } else if (e.code === 'KeyR' && e.ctrlKey) {
                e.preventDefault();
                this.reset();
            } else if (e.code === 'KeyS' && e.ctrlKey) {
                e.preventDefault();
                this.skipSession();
            }
        });
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
        
        // Create skip sound
        this.skipSound = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }
    
    updateAudioVolume() {
        // Volume is updated in real-time when sounds are played
    }
    
    updateVolumeIcon() {
        const icon = document.getElementById('volumeIcon');
        const volume = Math.round(this.volume * 100);
        
        if (volume === 0) {
            icon.className = 'bi bi-volume-mute-fill';
        } else if (volume < 33) {
            icon.className = 'bi bi-volume-off-fill';
        } else if (volume < 66) {
            icon.className = 'bi bi-volume-down-fill';
        } else {
            icon.className = 'bi bi-volume-up-fill';
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'flex';
        
        this.startSound();
        this.updateMotivationalMessage();
        this.animateTimerStart();
        
        this.interval = setInterval(() => this.tick(), 1000);
    }
    
    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
        
        document.getElementById('startBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';
        
        this.animateTimerPause();
    }
    
    reset() {
        this.pause();
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        this.updateDisplay();
        this.updateMotivationalMessage();
        this.animateTimerReset();
    }
    
    skipSession() {
        this.skipSound();
        this.completeSession(true); // true means skipped
    }
    
    switchMode(mode) {
        if (this.isRunning) return;
        
        this.isBreak = mode === 'break';
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        
        // Update tabs
        document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(mode + 'Tab').classList.add('active');
        
        this.updateModeDisplay();
        this.updateDisplay();
        this.updateMotivationalMessage();
    }
    
    setQuickDuration(minutes) {
        if (minutes === 25 || minutes === 50 || minutes === 75 || minutes === 100) {
            this.workTime = minutes;
            if (!this.isRunning && !this.isBreak) {
                this.currentTime = this.workTime * 60;
                this.updateDisplay();
            }
        }
        
        // Update quick buttons
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.time) === minutes) {
                btn.classList.add('active');
            }
        });
        
        this.saveSettings();
    }
    
    updateTimeButtons() {
        // Update work duration buttons
        document.querySelectorAll('.setting-group:first-child .time-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.minutes) === this.workTime);
        });
        
        // Update break duration buttons
        document.querySelectorAll('.setting-group:nth-child(2) .time-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.minutes) === this.breakTime);
        });
    }
    
    tick() {
        this.currentTime--;
        
        if (this.currentTime < 0) {
            this.completeSession();
        } else {
            this.updateDisplay();
            
            // Update motivational message every 45 seconds
            if (this.currentTime % 45 === 0) {
                this.updateMotivationalMessage();
            }
            
            // Add pulse animation when less than 10 seconds
            if (this.currentTime === 10) {
                document.querySelector('.timer-circle').classList.add('pulse');
            }
        }
    }
    
    completeSession(skipped = false) {
        this.pause();
        
        if (!skipped) {
            this.completeSound();
        }
        
        // Show browser notification
        if (this.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            const message = this.isBreak ? 'Break time is over! Ready to work?' : 'Great work! Time for a break!';
            new Notification('PomPomFocus', {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>',
                tag: 'pomodoro'
            });
        }
        
        // Update statistics
        if (!this.isBreak && !skipped) {
            this.stats.totalSessions++;
            this.stats.totalFocusTime += this.workTime;
            this.stats.todaySessions++;
            this.stats.sessionHistory.push({
                date: new Date().toISOString(),
                duration: this.workTime,
                type: 'work'
            });
            this.updateWeeklyData();
            this.sessionNumber++;
            this.updateSessionNumber();
            this.updateStreak();
            this.checkAchievements();
        }
        
        this.saveData();
        this.updateStats();
        this.updateWeeklyChart();
        
        // Switch modes
        this.isBreak = !this.isBreak;
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        
        // Update UI
        this.updateModeDisplay();
        this.updateDisplay();
        this.updateMotivationalMessage();
        
        // Auto-start next session
        if (this.autoStart) {
            setTimeout(() => {
                if (!this.isRunning) {
                    this.start();
                }
            }, 3000);
        }
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timerDisplay').textContent = display;
        
        // Update progress ring
        const totalTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        const progress = (totalTime - this.currentTime) / totalTime;
        const circumference = 2 * Math.PI * 130;
        const offset = circumference - (progress * circumference);
        
        document.getElementById('progressRing').style.strokeDashoffset = offset;
        
        // Update document title
        document.title = `${display} - PomPomFocus`;
        
        // Remove pulse animation when timer is reset
        if (this.currentTime === totalTime) {
            document.querySelector('.timer-circle').classList.remove('pulse');
        }
    }
    
    updateModeDisplay() {
        const timerCard = document.querySelector('.timer-card');
        
        if (this.isBreak) {
            timerCard.classList.add('break-mode');
        } else {
            timerCard.classList.remove('break-mode');
        }
        
        // Update mode tabs
        document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(this.isBreak ? 'breakTab' : 'workTab').classList.add('active');
    }
    
    updateMotivationalMessage() {
        const messages = this.isBreak ? this.breakMessages : this.workMessages;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        const messageElement = document.getElementById('motivationalMessage');
        
        messageElement.style.animation = 'none';
        setTimeout(() => {
            messageElement.textContent = randomMessage;
            messageElement.style.animation = 'fadeInUp 0.5s ease';
        }, 100);
    }
    
    updateCurrentTime() {
        const now = new Date();
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        const timeString = now.toLocaleDateString('en-US', options);
        const timeElement = document.getElementById('currentTime');
        
        if (timeElement) {
            timeElement.querySelector('span').textContent = timeString;
        }
    }
    
    updateSessionNumber() {
        document.getElementById('sessionNumber').textContent = this.sessionNumber;
    }
    
    updateStats() {
        let sessions, focusTime;
        
        switch (this.currentPeriod) {
            case 'today':
                sessions = this.stats.todaySessions;
                focusTime = this.getTodayFocusTime();
                break;
            case 'week':
                sessions = this.getWeekSessions();
                focusTime = this.getWeekFocusTime();
                break;
            case 'all':
                sessions = this.stats.totalSessions;
                focusTime = this.stats.totalFocusTime;
                break;
        }
        
        document.getElementById('totalSessions').textContent = sessions;
        document.getElementById('todaySessions').textContent = this.stats.todaySessions;
        document.getElementById('currentStreak').textContent = this.stats.currentStreak;
        
        // Format focus time
        const hours = Math.floor(focusTime / 60);
        const minutes = focusTime % 60;
        document.getElementById('totalFocusTime').textContent = `${hours}h ${minutes}m`;
    }
    
    updateWeeklyChart() {
        const weeklyData = this.stats.weeklyData;
        const bars = document.querySelectorAll('.chart-bar');
        
        bars.forEach((bar, index) => {
            const barFill = bar.querySelector('.bar-fill');
            const height = weeklyData[index] || 0;
            const maxHeight = Math.max(...weeklyData) || 1;
            const percentage = (height / maxHeight) * 100;
            
            barFill.style.height = `${Math.max(percentage, 5)}%`;
        });
    }
    
    updateWeeklyData() {
        const today = new Date().getDay();
        const todayIndex = today === 0 ? 6 : today - 1; // Convert to Monday=0 index
        
        if (!this.stats.weeklyData[todayIndex]) {
            this.stats.weeklyData[todayIndex] = 0;
        }
        this.stats.weeklyData[todayIndex] += this.workTime;
    }
    
    generateWeeklyData() {
        return [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    }
    
    getTodayFocusTime() {
        const today = new Date().toDateString();
        return this.stats.sessionHistory
            .filter(session => new Date(session.date).toDateString() === today)
            .reduce((total, session) => total + session.duration, 0);
    }
    
    getWeekSessions() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return this.stats.sessionHistory
            .filter(session => new Date(session.date) >= oneWeekAgo)
            .length;
    }
    
    getWeekFocusTime() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return this.stats.sessionHistory
            .filter(session => new Date(session.date) >= oneWeekAgo)
            .reduce((total, session) => total + session.duration, 0);
    }
    
    updateStreak() {
        const today = new Date().toDateString();
        const lastActive = this.stats.lastActiveDate ? new Date(this.stats.lastActiveDate).toDateString() : null;
        
        if (lastActive === today) {
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActive === yesterday.toDateString()) {
            this.stats.currentStreak++;
        } else {
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
            '<i class="bi bi-palette-fill"></i><span class="btn-text">Light Mode</span>' : 
            '<i class="bi bi-palette-fill"></i><span class="btn-text">Pink Mode</span>';
        
        localStorage.setItem('pompomfocus-theme', isPink ? 'pink' : 'light');
    }
    
    checkAchievements() {
        const achievements = this.achievements;
        
        // First Timer
        if (!achievements.firstTimer.unlocked && this.stats.totalSessions >= 1) {
            this.unlockAchievement('firstTimer');
        }
        
        // On Fire
        if (!achievements.onFire.unlocked && this.stats.currentStreak >= 7) {
            this.unlockAchievement('onFire');
        }
        
        // Speed Focus
        if (!achievements.speedFocus.unlocked && this.stats.totalSessions >= 10) {
            this.unlockAchievement('speedFocus');
        }
        
        // Focus Master
        if (!achievements.focusMaster.unlocked && this.stats.totalSessions >= 100) {
            this.unlockAchievement('focusMaster');
        }
        
        // Early Bird
        const currentHour = new Date().getHours();
        if (!achievements.earlyBird.unlocked && currentHour < 9 && this.stats.todaySessions > 0) {
            this.unlockAchievement('earlyBird');
        }
        
        // Night Owl
        if (!achievements.nightOwl.unlocked && currentHour >= 22 && this.stats.todaySessions > 0) {
            this.unlockAchievement('nightOwl');
        }
        
        // Marathon
        if (!achievements.marathon.unlocked && this.stats.todaySessions >= 4) {
            this.unlockAchievement('marathon');
        }
        
        // Consistent
        if (!achievements.consistent.unlocked && this.stats.currentStreak >= 7) {
            this.unlockAchievement('consistent');
        }
    }
    
    unlockAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        achievement.unlocked = true;
        
        // Update UI
        const badge = document.querySelector(`[data-achievement="${achievementId}"]`);
        if (badge) {
            badge.classList.remove('locked');
            badge.classList.add('unlocked');
        }
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        this.saveAchievements();
    }
    
    showAchievementNotification(achievement) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-popup">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">Achievement Unlocked!</div>
                    <div class="achievement-name">${achievement.title}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    animateTimerStart() {
        const timerCircle = document.querySelector('.timer-circle');
        timerCircle.classList.add('bounce');
        setTimeout(() => timerCircle.classList.remove('bounce'), 1000);
    }
    
    animateTimerPause() {
        const timerCircle = document.querySelector('.timer-circle');
        timerCircle.classList.add('shake');
        setTimeout(() => timerCircle.classList.remove('shake'), 500);
    }
    
    animateTimerReset() {
        const timerCircle = document.querySelector('.timer-circle');
        timerCircle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            timerCircle.style.transform = 'scale(1)';
        }, 200);
    }
    
    exportData() {
        const data = {
            stats: this.stats,
            achievements: this.achievements,
            settings: {
                workTime: this.workTime,
                breakTime: this.breakTime,
                volume: this.volume,
                theme: document.getElementById('appContainer').classList.contains('pink-theme') ? 'pink' : 'light',
                autoStart: this.autoStart,
                notificationsEnabled: this.notificationsEnabled
            },
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pompomfocus-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show success message
        this.showSuccessMessage('Data exported successfully!');
    }
    
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(successDiv);
            }, 300);
        }, 3000);
    }
    
    loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('pompomfocus-theme');
        if (savedTheme === 'pink') {
            document.getElementById('appContainer').classList.add('pink-theme');
            document.getElementById('themeToggle').innerHTML = '<i class="bi bi-palette-fill"></i><span class="btn-text">Light Mode</span>';
        }
        
        // Load volume
        const savedVolume = localStorage.getItem('pompomfocus-volume');
        if (savedVolume) {
            this.volume = parseFloat(savedVolume);
            document.getElementById('volumeControl').value = this.volume * 100;
            document.getElementById('volumeValue').textContent = `${Math.round(this.volume * 100)}%`;
            this.updateVolumeIcon();
        }
        
        // Load timer settings
        const savedWorkTime = localStorage.getItem('pompomfocus-work-time');
        if (savedWorkTime) {
            this.workTime = parseInt(savedWorkTime);
            this.currentTime = this.workTime * 60;
        }
        
        const savedBreakTime = localStorage.getItem('pompomfocus-break-time');
        if (savedBreakTime) {
            this.breakTime = parseInt(savedBreakTime);
        }
        
        // Load other settings
        const savedAutoStart = localStorage.getItem('pompomfocus-auto-start');
        if (savedAutoStart !== null) {
            this.autoStart = JSON.parse(savedAutoStart);
            document.getElementById('autoStartToggle').checked = this.autoStart;
        }
        
        const savedNotifications = localStorage.getItem('pompomfocus-notifications');
        if (savedNotifications !== null) {
            this.notificationsEnabled = JSON.parse(savedNotifications);
            document.getElementById('notificationToggle').checked = this.notificationsEnabled;
        }
        
        this.updateTimeButtons();
    }
    
    saveSettings() {
        localStorage.setItem('pompomfocus-volume', this.volume);
        localStorage.setItem('pompomfocus-work-time', this.workTime);
        localStorage.setItem('pompomfocus-break-time', this.breakTime);
        localStorage.setItem('pompomfocus-auto-start', JSON.stringify(this.autoStart));
        localStorage.setItem('pompomfocus-notifications', JSON.stringify(this.notificationsEnabled));
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
    
    loadAchievements() {
        const savedAchievements = localStorage.getItem('pompomfocus-achievements');
        if (savedAchievements) {
            const parsed = JSON.parse(savedAchievements);
            this.achievements = { ...this.achievements, ...parsed };
        }
        
        // Update achievement UI
        this.updateAchievementUI();
    }
    
    saveAchievements() {
        localStorage.setItem('pompomfocus-achievements', JSON.stringify(this.achievements));
    }
    
    updateAchievementUI() {
        const achievementsGrid = document.querySelector('.achievements-grid');
        achievementsGrid.innerHTML = '';
        
        Object.entries(this.achievements).forEach(([key, achievement]) => {
            const badge = document.createElement('div');
            badge.className = `achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            badge.setAttribute('data-achievement', key);
            badge.innerHTML = `
                <div class="badge-icon">${achievement.icon}</div>
                <div class="badge-title">${achievement.title}</div>
                <div class="badge-desc">${achievement.desc}</div>
            `;
            achievementsGrid.appendChild(badge);
        });
    }
    
    saveData() {
        this.saveSettings();
        this.saveStats();
        this.saveAchievements();
    }
    
    clearData() {
        if (confirm('Are you sure you want to clear all data? This will reset your statistics and achievements and cannot be undone.')) {
            // Clear all localStorage data
            localStorage.removeItem('pompomfocus-stats');
            localStorage.removeItem('pompomfocus-achievements');
            
            // Reset stats
            this.stats = {
                totalSessions: 0,
                totalFocusTime: 0,
                todaySessions: 0,
                currentStreak: 0,
                lastActiveDate: null,
                sessionHistory: [],
                weeklyData: this.generateWeeklyData()
            };
            
            // Reset achievements
            Object.keys(this.achievements).forEach(key => {
                this.achievements[key].unlocked = false;
            });
            
            // Reset session number
            this.sessionNumber = 1;
            
            // Update UI
            this.updateStats();
            this.updateSessionNumber();
            this.updateWeeklyChart();
            this.updateAchievementUI();
            
            // Show success message
            this.showSuccessMessage('All data cleared successfully!');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pompomfocus = new PomPomFocus();
});

// Handle visibility change to pause timer when tab is not visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.pompomfocus && window.pompomfocus.isRunning) {
        // Optional: pause timer when tab is not visible
        // window.pompomfocus.pause();
    }
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .achievement-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .achievement-notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .achievement-popup {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-xl);
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 300px;
    }
    
    .achievement-icon {
        font-size: 2rem;
    }
    
    .achievement-title {
        font-weight: 600;
        margin-bottom: 0.25rem;
    }
    
    .achievement-name {
        font-size: 0.9rem;
        opacity: 0.9;
    }
`;
document.head.appendChild(style);