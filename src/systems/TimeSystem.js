export class TimeSystem {
    constructor() {
        if (TimeSystem.instance) {
            return TimeSystem.instance;
        }
        TimeSystem.instance = this;

        // Time State
        this.day = 0; // 0 = Monday
        this.hour = 8; // Start at 8 AM
        this.minute = 0;
        this.secondsAccumulator = 0;

        // Configuration
        // 1 Game Day = 3600 Real Seconds (1 Hour)
        // 24 Game Hours = 3600 Real Seconds
        // 1 Game Hour = 150 Real Seconds
        // 1 Game Minute = 2.5 Real Seconds
        this.realSecondsPerGameMinute = 2.5;

        this.daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    }

    update(deltaMS) {
        // Delta is in milliseconds
        const deltaSeconds = deltaMS / 1000;
        this.secondsAccumulator += deltaSeconds;

        while (this.secondsAccumulator >= this.realSecondsPerGameMinute) {
            this.secondsAccumulator -= this.realSecondsPerGameMinute;
            this.advanceMinute();
        }
    }

    advanceMinute() {
        this.minute++;
        if (this.minute >= 60) {
            this.minute = 0;
            this.hour++;
            if (this.hour >= 24) {
                this.hour = 0;
                this.day++;
                if (this.day >= 7) {
                    this.day = 0;
                }
            }
        }
    }

    advanceTime(hoursToAdd) {
        this.hour += hoursToAdd;
        while (this.hour >= 24) {
            this.hour -= 24;
            this.day++;
            if (this.day >= 7) {
                this.day = 0;
            }
        }
    }

    getFormattedTime() {
        const h = this.hour.toString().padStart(2, '0');
        const m = this.minute.toString().padStart(2, '0');
        return `${h}:${m}`;
    }

    getWeekdayName() {
        return this.daysOfWeek[this.day];
    }

    getLightLevel() {
        // Returns alpha value for darkness overlay (0.0 = bright, 1.0 = pitch black)
        // We want partial darkness at night, e.g., 0.6

        const time = this.hour + (this.minute / 60);

        // Dawn: 4:00 - 6:00
        if (time >= 4 && time < 6) {
            // 4:00 -> 0.6
            // 6:00 -> 0.0
            const progress = (time - 4) / 2;
            return 0.6 * (1 - progress);
        }

        // Day: 6:00 - 18:00
        if (time >= 6 && time < 18) {
            return 0.0;
        }

        // Dusk: 18:00 - 20:00
        if (time >= 18 && time < 20) {
            // 18:00 -> 0.0
            // 20:00 -> 0.6
            const progress = (time - 18) / 2;
            return 0.6 * progress;
        }

        // Night: 20:00 - 4:00
        return 0.6;
    }
}

export const timeSystem = new TimeSystem();
