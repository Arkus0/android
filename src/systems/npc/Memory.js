export class Memory {
    constructor(profile) {
        this.profile = profile;
        this.shortTerm = []; // Deleted after X days
        this.longTerm = [];  // Permanent
    }

    addEvent(event, significant = false) {
        const memory = {
            ...event,
            timestamp: Date.now() // Ideally game time
        };

        if (significant) {
            this.longTerm.push(memory);
        } else {
            this.shortTerm.push(memory);
        }

        // Cap short term
        if (this.shortTerm.length > 20) {
            this.shortTerm.shift();
        }
    }

    // Stub for pruning old short term memories
    prune(currentGameDay) {
        // Implementation dependent on how we store game time in memory
    }
}
