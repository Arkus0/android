import { timeSystem } from '../src/systems/TimeSystem.js';
import { npcManager } from '../src/systems/npc/NPCManager.js';
import { NPC_DATA } from '../src/data/NPCData.js';

console.log("--- STARTING 20-NPC VERIFICATION ---");

// 1. Bulk Register
NPC_DATA.forEach(config => {
    npcManager.registerNPC(config);
});

console.log(`Registered ${npcManager.getAllNPCs().length} NPCs.`);

if (npcManager.getAllNPCs().length !== 20) {
    console.error("FAIL: Expected 20 NPCs.");
}

// 2. Simulate Time - Lunes 9:00 (Active Work Time)
timeSystem.day = 0; // Lunes
timeSystem.hour = 9;
timeSystem.minute = 0;

console.log("\n--- Simulating Lunes 9:00 AM ---");
npcManager.update(timeSystem);

// Verify Specific Key NPCs
const marcus = npcManager.getNPC('marcus');
console.log(`Marcus (Blacksmith): ${marcus.currentState.action} @ ${marcus.currentState.location}`);
if (marcus.currentState.location !== 'FORGE') console.error("FAIL: Marcus should be at FORGE");

const alonso = npcManager.getNPC('alonso');
console.log(`Alonso (Priest): ${alonso.currentState.action} @ ${alonso.currentState.location}`);
if (alonso.currentState.location !== 'CHURCH') console.error("FAIL: Alonso should be at CHURCH");

const elena = npcManager.getNPC('elena'); // Starts at 10
console.log(`Elena (Tavern): ${elena.currentState.action} @ ${elena.currentState.location}`);
// Elena 10-24 work. At 9 she has no slot, defaults to WANDER/HOME.
// Wait, schedule default fallback check.

// 3. Simulate Time - Lunes 19:00 (Evening Social)
timeSystem.hour = 19;
console.log("\n--- Simulating Lunes 19:00 PM ---");
npcManager.update(timeSystem);

console.log(`Marcus (Blacksmith): ${marcus.currentState.action} @ ${marcus.currentState.location}`);
// 18-22 Social Home
if (marcus.currentState.location !== 'HOME') console.error("FAIL: Marcus should be at HOME");

const garrick = npcManager.getNPC('garrick');
console.log(`Garrick (Hunter): ${garrick.currentState.action} @ ${garrick.currentState.location}`);
// 16-22 Drink Tavern
if (garrick.currentState.location !== 'TAVERN') console.error("FAIL: Garrick should be at TAVERN");

console.log("\n--- Verification Complete ---");
