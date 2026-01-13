import { NPCProfile } from './NPCProfile.js';

export class NPCManager {
    constructor() {
        if (NPCManager.instance) return NPCManager.instance;
        NPCManager.instance = this;

        this.npcs = new Map();
        this.lastUpdateHour = -1;
    }

    registerNPC(config) {
        const profile = new NPCProfile(config);
        this.npcs.set(profile.id, profile);
        console.log(`[NPCManager] Registered ${profile.name} (${profile.id})`);
        return profile;
    }

    getNPC(id) {
        return this.npcs.get(id);
    }

    getAllNPCs() {
        return Array.from(this.npcs.values());
    }

    update(timeSystem) {
        // Run logic only when the game hour changes
        // Note: In a real game we might stagger updates to avoid spikes
        if (timeSystem.hour !== this.lastUpdateHour) {
            this.processGameHour(timeSystem);
            this.lastUpdateHour = timeSystem.hour;
        }
    }

    processGameHour(timeSystem) {
        const day = timeSystem.getWeekdayName();
        const hour = timeSystem.hour;

        console.log(`--- NPC SIMULATION: ${day} ${hour}:00 ---`);

        for (const npc of this.npcs.values()) {
            // 1. Update Needs (Decay)
            npc.needs.update(1); // 1 hour passed

            // 2. Decision Logic
            let action = 'IDLE';
            let location = 'HOME';
            let override = false;

            // Check Critical Needs first (Survival)
            const lowest = npc.needs.getLowest();
            if (npc.needs.isCritical(lowest.type)) {
                override = true;
                // Simple mapping of needs to actions
                switch (lowest.type) {
                    case 'hunger':
                        action = 'EAT';
                        location = 'TAVERN';
                        break;
                    case 'energy':
                        action = 'SLEEP';
                        location = 'HOME';
                        break;
                    case 'fun':
                        action = 'PLAY';
                        location = 'PLAZA';
                        break;
                    case 'social':
                        action = 'TALK';
                        location = 'PLAZA';
                        break;
                    default:
                        action = 'IDLE';
                }
            }

            // If no critical need, follow schedule
            if (!override) {
                const slot = npc.schedule.getCurrentSlot(day, hour);
                if (slot) {
                    action = slot.activity;
                    location = slot.location;
                } else {
                    // Default behavior if no slot
                    if (hour >= 22 || hour < 6) {
                        action = 'SLEEP';
                        location = 'HOME';
                    } else {
                        action = 'WANDER';
                        location = 'VILLAGE';
                    }
                }
            }

            // Apply State
            npc.setState(action, location);
        }
    }

    // Event Reaction System Stub
    reactToEvent(event) {
        console.log(`[NPCManager] Global Event: ${event.type}`);
        for (const npc of this.npcs.values()) {
            // Propagate to each NPC for individual reactions
            // npc.memory.addEvent(event);

            if (event.type === 'DANGER') {
                npc.setState('FLEE', 'HOME');
            }
        }
    }

    // Long-term Evolution System Stub
    evolve() {
        console.log(`[NPCManager] Running Evolution Cycle...`);
        // Logic for aging, relationship decay/growth over months
    }
}

export const npcManager = new NPCManager();
