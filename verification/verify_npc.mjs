import { timeSystem } from '../src/systems/TimeSystem.js';
import { npcManager } from '../src/systems/npc/NPCManager.js';

// Mock console.log to keep output clean or just use standard
// We assume logic doesn't depend on DOM/Phaser

console.log("--- STARTING NPC VERIFICATION ---");

// 1. Register a Dummy NPC
const testNPC = npcManager.registerNPC({
    id: 'test_npc',
    name: 'Testy',
    schedule: {
        'Lunes': [ // TimeSystem uses Spanish names: ['Lunes', 'Martes', ...]
            { start: 8, end: 12, activity: 'WORK', location: 'OFFICE' },
            { start: 12, end: 13, activity: 'EAT', location: 'KITCHEN' },
            { start: 13, end: 18, activity: 'WORK', location: 'OFFICE' }
        ]
    }
});

console.log(`Initialized NPC: ${testNPC.name}, Hunger: ${testNPC.needs.stats.hunger}`);

// Force known stats
testNPC.needs.stats.hunger = 50;
testNPC.needs.stats.energy = 100;

// 2. Simulate Time - Lunes 7:00 (Before Work)
timeSystem.day = 0; // Lunes
timeSystem.hour = 7;
timeSystem.minute = 0;

console.log("\n--- Simulating 7:00 AM (Should be default/WANDER/IDLE) ---");
npcManager.update(timeSystem);
console.log(`State: ${testNPC.currentState.action} @ ${testNPC.currentState.location}`);

// 3. Advance to 8:00 (Work Start)
timeSystem.hour = 8;
console.log("\n--- Simulating 8:00 AM (Should be WORK) ---");
npcManager.update(timeSystem);
console.log(`State: ${testNPC.currentState.action} @ ${testNPC.currentState.location}`);

if (testNPC.currentState.action !== 'WORK') {
    console.error("FAIL: Expected WORK");
}

// 4. Advance to 12:00 (Lunch)
timeSystem.hour = 12;
console.log("\n--- Simulating 12:00 PM (Should be EAT) ---");
npcManager.update(timeSystem);
console.log(`State: ${testNPC.currentState.action} @ ${testNPC.currentState.location}`);

if (testNPC.currentState.action !== 'EAT') {
    console.error("FAIL: Expected EAT");
}

// 5. Simulate Hunger Decay to Critical
console.log("\n--- Simulating Critical Hunger ---");
testNPC.needs.stats.hunger = 10; // Critical (<20)
timeSystem.hour = 14; // Should be WORK per schedule, but Hunger should override
npcManager.update(timeSystem);

console.log(`Hunger: ${testNPC.needs.stats.hunger}`);
console.log(`State: ${testNPC.currentState.action} @ ${testNPC.currentState.location}`);

if (testNPC.currentState.action === 'EAT') {
    console.log("SUCCESS: Critical Hunger overrode Schedule.");
} else {
    console.error(`FAIL: Expected EAT override, got ${testNPC.currentState.action}`);
}

console.log("\n--- Verification Complete ---");
