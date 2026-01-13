export class Needs {
    constructor(profile) {
        this.profile = profile;
        // 0-100 scale. 100 is good/full.
        this.stats = {
            hunger: 80 + Math.random() * 20,
            energy: 80 + Math.random() * 20,
            social: 80 + Math.random() * 20,
            fun: 80 + Math.random() * 20,
            hygiene: 80 + Math.random() * 20,
            safety: 100
        };

        // Decay per game hour
        this.decayRates = {
            hunger: 5,   // ~20 hours to 0
            energy: 4,   // ~25 hours to 0
            social: 2,
            fun: 2,
            hygiene: 1,
            safety: 0
        };
    }

    update(deltaHours) {
        for (const [key, rate] of Object.entries(this.decayRates)) {
            this.modify(key, -(rate * deltaHours));
        }
    }

    modify(stat, amount) {
        if (this.stats[stat] !== undefined) {
            this.stats[stat] = Math.max(0, Math.min(100, this.stats[stat] + amount));
        }
    }

    getLowest() {
        let lowest = null;
        let minVal = 101;
        for (const [key, val] of Object.entries(this.stats)) {
            if (val < minVal) {
                minVal = val;
                lowest = key;
            }
        }
        return { type: lowest, value: minVal };
    }

    isCritical(stat) {
        return this.stats[stat] < 20;
    }
}
