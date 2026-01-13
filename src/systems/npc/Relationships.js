export class Relationships {
    constructor(profile) {
        this.profile = profile;
        this.network = new Map(); // targetId -> { value: 0, type: 'NEUTRAL', history: [] }
    }

    getRelation(targetId) {
        if (!this.network.has(targetId)) {
            this.network.set(targetId, { value: 0, type: 'NEUTRAL', history: [] });
        }
        return this.network.get(targetId);
    }

    modify(targetId, amount, reason) {
        const rel = this.getRelation(targetId);
        rel.value = Math.max(-100, Math.min(100, rel.value + amount));
        if (reason) {
            rel.history.push({ day: 'Unknown', reason: reason }); // Needs real day reference if passed
        }
        this.updateType(rel);
    }

    updateType(rel) {
        if (rel.value > 80) rel.type = 'BEST_FRIEND';
        else if (rel.value > 50) rel.type = 'FRIEND';
        else if (rel.value > 10) rel.type = 'ACQUAINTANCE';
        else if (rel.value < -80) rel.type = 'NEMESIS';
        else if (rel.value < -20) rel.type = 'DISLIKED';
        else rel.type = 'NEUTRAL';
    }
}
