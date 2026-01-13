export class Goals {
    constructor(profile) {
        this.profile = profile;
        this.activeGoals = []; // [{ type: 'LEARN_COMBAT', priority: 5, progress: 0 }]
    }

    addGoal(goal) {
        this.activeGoals.push(goal);
        this.activeGoals.sort((a, b) => b.priority - a.priority);
    }

    removeGoal(type) {
        this.activeGoals = this.activeGoals.filter(g => g.type !== type);
    }

    getTopGoal() {
        return this.activeGoals.length > 0 ? this.activeGoals[0] : null;
    }
}
