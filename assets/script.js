// PomPomFocus - Minimalist Cute Pomodoro Timer JavaScript

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

        // Statistics
        this.stats = {
            totalSessions: 0,
            totalFocusTime: 0, // in minutes
            todaySessions: 0,
            currentStreak: 0,
            lastActiveDate: null,
            sessionHistory: []
        };

        // Simplified motivational messages
        this.workMessages = [
            "Ready to focus? 🌟",
            "You've got this! 💪",
            "Stay focused! 🎯",
            "Keep going! ⭐",
            "Almost there! 🚀"
        ];

        this.breakMessages = [
            "Time to relax! 🌸",
            "Take a break! ☕",
            "Refresh yourself! 💧",
            "You earned this! 🎉",
            "Chill time! 🌙"
        ];

        this.workDurations = [25, 50, 75, 100];
        this.breakDurations = [5, 10, 15, 20];

        this.init();
    }

    init() {
        this.loadSettings();
        this.loadStats();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStats();
        this.updateSessionNumber();
        this.setupAudio();
        this.updateQuickSettingsButtons();
        this.setSelectableButtonsDisabled(false);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Update document title periodically
        setInterval(() => this.updateDocumentTitle(), 1000);

        // Save data periodically
        setInterval(() => this.saveData(), 30000);
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipSession());

        // Mode buttons
        document.getElementById('workMode').addEventListener('click', () => this.switchMode('work'));
        document.getElementById('breakMode').addEventListener('click', () => this.switchMode('break'));

        // Quick settings duration buttons
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                if (Number.isNaN(minutes)) return;

                if (this.isBreak) {
                    this.setBreakDuration(minutes);
                } else {
                    this.setWorkDuration(minutes);
                }
            });
        });

        // Settings buttons
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.toggleSettings());

        // Settings options - use event delegation for better reliability
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn')) {
                const minutes = parseInt(e.target.dataset.minutes);
                const settingGroup = e.target.closest('.setting-group');
                const label = settingGroup?.querySelector('.setting-label');

                if (label) {
                    const isWork = label.textContent.includes('Focus');

                    if (isWork) {
                        this.setWorkDuration(minutes);
                    } else {
                        this.setBreakDuration(minutes);
                    }
                }
            }
        });

        // Volume control
        document.getElementById('volumeControl').addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            document.getElementById('volumeValue').textContent = `${e.target.value}%`;
        });

        // Toggle switches
        document.getElementById('autoStartToggle').addEventListener('change', (e) => {
            this.autoStart = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('notificationToggle').addEventListener('change', (e) => {
            this.notificationsEnabled = e.target.checked;
            this.saveSettings();
        });

        // Action buttons
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());

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
            } else if (e.code === 'Escape') {
                this.hideSettings();
            }
        });
    }

    setupAudio() {
        // Create audio context for sounds
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create start sound
        this.startSound = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };

        // Create completion sound
        this.completeSound = () => {
            const notes = [523.25, 659.25, 783.99]; // C, E, G
            const duration = 0.15;

            notes.forEach((frequency, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);

                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + duration);
                }, index * duration * 1000);
            });
        };
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'flex';

        this.startSound();
        this.updateMotivationalMessage();
        this.setSelectableButtonsDisabled(true);

        this.interval = setInterval(() => this.tick(), 1000);
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.interval);

        document.getElementById('startBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';
        this.setSelectableButtonsDisabled(false);
    }

    reset() {
        this.pause();
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;
        this.updateDisplay();
        this.updateMotivationalMessage();
    }

    skipSession() {
        this.completeSession(true); // true means skipped
    }

    switchMode(mode) {
        if (this.isRunning) return;

        this.isBreak = mode === 'break';
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;

        this.updateModeDisplay();
        this.updateDisplay();
        this.updateMotivationalMessage();
    }

    setWorkDuration(minutes) {
        if (!this.workDurations.includes(minutes)) return;

        this.workTime = minutes;
        if (!this.isRunning && !this.isBreak) {
            this.currentTime = this.workTime * 60;
            this.updateDisplay();
        }

        // Update settings options
        this.updateSettingsOptions('focus', minutes);

        this.saveSettings();

        if (!this.isBreak) {
            this.updateDurationButtons();
        }
    }

    setBreakDuration(minutes) {
        if (!this.breakDurations.includes(minutes)) return;

        this.breakTime = minutes;
        if (!this.isRunning && this.isBreak) {
            this.currentTime = this.breakTime * 60;
            this.updateDisplay();
        }

        // Update UI immediately
        this.updateSettingsOptions('break', minutes);

        // Save settings
        this.saveSettings();

        if (this.isBreak) {
            this.updateDurationButtons();
        }
    }

    updateSettingsOptions(type, minutes) {
        // Find the setting group by label text instead of index
        const settingGroups = document.querySelectorAll('.setting-group');
        let targetGroup = null;

        settingGroups.forEach(group => {
            const label = group.querySelector('.setting-label');
            if (label) {
                if (type === 'focus' && label.textContent.includes('Focus')) {
                    targetGroup = group;
                } else if (type === 'break' && label.textContent.includes('Break')) {
                    targetGroup = group;
                }
            }
        });

        if (targetGroup) {
            const optionButtons = targetGroup.querySelectorAll('.option-btn');
            optionButtons.forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.minutes) === minutes) {
                    btn.classList.add('active');
                }
            });
        }
    }

    tick() {
        this.currentTime--;

        if (this.currentTime < 0) {
            this.completeSession();
        } else {
            this.updateDisplay();

            // Update motivational message every 60 seconds
            if (this.currentTime % 60 === 0) {
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
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>'
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
            this.sessionNumber++;
            this.updateSessionNumber();
            this.updateStreak();
        }

        this.saveData();
        this.updateStats();

        // Switch modes
        this.isBreak = !this.isBreak;
        this.currentTime = this.isBreak ? this.breakTime * 60 : this.workTime * 60;

        // Update UI
        this.updateDisplay();
        this.updateMotivationalMessage();
        this.updateModeDisplay();

        // Auto-start next session
        if (this.autoStart && !skipped) {
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
        const circumference = 2 * Math.PI * 110;
        const offset = circumference - (progress * circumference);

        document.getElementById('progressRing').style.strokeDashoffset = offset;

        // Remove pulse animation when timer is reset
        if (this.currentTime === totalTime) {
            document.querySelector('.timer-circle').classList.remove('pulse');
        }
    }

    updateModeDisplay() {
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(this.isBreak ? 'breakMode' : 'workMode').classList.add('active');

        // Update timer card class for styling
        const timerCard = document.querySelector('.timer-card');
        if (this.isBreak) {
            timerCard.classList.add('break-mode');
        } else {
            timerCard.classList.remove('break-mode');
        }

        this.updateQuickSettingsButtons();
    }

    updateMotivationalMessage() {
        const messages = this.isBreak ? this.breakMessages : this.workMessages;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        const messageElement = document.getElementById('motivationalMessage');

        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageElement.textContent = randomMessage;
            messageElement.style.opacity = '1';
        }, 200);
    }

    updateSessionNumber() {
        document.getElementById('sessionNumber').textContent = this.sessionNumber;
    }

    updateStats() {
        document.getElementById('totalSessions').textContent = this.stats.totalSessions;
        document.getElementById('todaySessions').textContent = this.stats.todaySessions;
        document.getElementById('currentStreak').textContent = this.stats.currentStreak;

        // Format focus time
        const hours = Math.floor(this.stats.totalFocusTime / 60);
        const minutes = this.stats.totalFocusTime % 60;
        document.getElementById('totalFocusTime').textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    updateDocumentTitle() {
        if (this.isRunning) {
            const minutes = Math.floor(this.currentTime / 60);
            const seconds = this.currentTime % 60;
            const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            document.title = `${display} - PomPomFocus`;
        } else {
            document.title = 'PomPomFocus - Minimalist Cute Pomodoro Timer';
        }
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
        container.classList.toggle('pink-theme');

        const isPink = container.classList.contains('pink-theme');
        localStorage.setItem('pompomfocus-theme', isPink ? 'pink' : 'light');
    }

    toggleSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        const isVisible = settingsPanel.style.display !== 'none';

        if (isVisible) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }

    showSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        settingsPanel.style.display = 'block';

        // Update settings UI setelah element terlihat
        setTimeout(() => {
            this.updateSettingsOptions('focus', this.workTime);
            this.updateSettingsOptions('break', this.breakTime);
        }, 50);

        // Scroll to settings
        settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    hideSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        settingsPanel.style.display = 'none';
    }

    exportData() {
        const data = {
            stats: this.stats,
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

        this.showSuccessMessage('Data exported successfully!');
    }

    showSuccessMessage(message) {
        const existingMessage = document.querySelector('.success-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('pompomfocus-theme');
        if (savedTheme === 'pink') {
            document.getElementById('appContainer').classList.add('pink-theme');
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

        // Update UI - defer to ensure DOM is ready
        setTimeout(() => {
            this.updateSettingsOptions('focus', this.workTime);
            this.updateSettingsOptions('break', this.breakTime);
            this.updateQuickSettingsButtons();
        }, 100);
    }

    updateDurationButtons() {
        const targetValue = this.isBreak ? this.breakTime : this.workTime;
        document.querySelectorAll('.duration-btn').forEach(btn => {
            const btnValue = parseInt(btn.dataset.minutes);
            const isActive = !Number.isNaN(btnValue) && btnValue === targetValue;
            btn.classList.toggle('active', isActive);
        });
    }

    updateQuickSettingsButtons() {
        const durations = this.isBreak ? this.breakDurations : this.workDurations;
        const buttons = document.querySelectorAll('.duration-btn');

        buttons.forEach((btn, index) => {
            const value = durations[index];
            if (typeof value === 'number') {
                btn.dataset.minutes = String(value);
                btn.textContent = `${value}m`;
                btn.style.display = 'inline-flex';
            } else {
                btn.style.display = 'none';
            }
        });

        this.updateDurationButtons();
    }

    setSelectableButtonsDisabled(disabled) {
        const buttons = document.querySelectorAll('.duration-btn, .option-btn');
        buttons.forEach(btn => {
            btn.disabled = disabled;
            btn.classList.toggle('is-disabled', disabled);
        });
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

    saveData() {
        this.saveSettings();
        this.saveStats();
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This will reset your statistics and cannot be undone.')) {
            // Clear localStorage
            localStorage.removeItem('pompomfocus-stats');

            // Reset stats
            this.stats = {
                totalSessions: 0,
                totalFocusTime: 0,
                todaySessions: 0,
                currentStreak: 0,
                lastActiveDate: null,
                sessionHistory: []
            };

            // Reset session number
            this.sessionNumber = 1;

            // Update UI
            this.updateStats();
            this.updateSessionNumber();

            this.showSuccessMessage('All data cleared successfully!');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pompomfocus = new PomPomFocus();
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.pompomfocus && window.pompomfocus.isRunning) {
        // Optionally pause timer when tab is not visible
        // window.pompomfocus.pause();
    }
});