import { Needs } from './Needs.js';
import { Schedule } from './Schedule.js';
import { Relationships } from './Relationships.js';
import { Memory } from './Memory.js';
import { Goals } from './Goals.js';

export class NPCProfile {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.age = config.age || 20;
        this.traits = config.traits || []; // ['EXTROVERT', 'BRAVE']
        this.backstory = config.backstory || "";

        // Sub-systems
        this.needs = new Needs(this);
        this.schedule = new Schedule(this, config.schedule || {});
        this.relationships = new Relationships(this);
        this.memory = new Memory(this);
        this.goals = new Goals(this);

        // Runtime State
        this.currentState = {
            action: 'IDLE',      // IDLE, WORKING, SLEEPING, EATING, WALKING, TALKING
            location: 'HOME',    // HOME, TAVERN, BLACKSMITH, PLAZA
            target: null,        // Target object/position
            mood: 'NEUTRAL'
        };
    }

    // Called by Manager when processing logic
    setState(action, location) {
        if (this.currentState.action !== action) {
            console.log(`[NPC ${this.name}] State change: ${this.currentState.action} -> ${action} @ ${location}`);
            this.currentState.action = action;
            this.currentState.location = location;
        }
    }

    react(event) {
        // Stub for individual reaction logic based on traits
        // e.g. if (event.type === 'INSULT' && this.traits.includes('BRAVE')) ...

        // Always memorize
        this.memory.addEvent(event);

        console.log(`[NPC ${this.name}] Reacted to ${event.type}`);
    }
}
