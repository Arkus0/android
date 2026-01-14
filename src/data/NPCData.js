export const NPC_DATA = [
    {
        id: "marcus",
        name: "Marcus",
        role: "blacksmith",
        stats: { hunger: 80, energy: 80, social: 60, fun: 50 },
        traits: ["WORKAHOLIC", "HONEST", "LOYAL"],
        relationships: { "clara": 100, "tomas": 100, "elena": 80, "garrick": -40 },
        schedule: {
            "Lunes": [
                { start: 6, end: 8, activity: "EAT", location: "HOME" },
                { start: 8, end: 12, activity: "WORK", location: "FORGE" },
                { start: 12, end: 13, activity: "EAT", location: "TAVERN" },
                { start: 13, end: 18, activity: "WORK", location: "FORGE" },
                { start: 18, end: 22, activity: "SOCIAL", location: "HOME" }
            ],
            "Sabado": [
                { start: 8, end: 14, activity: "WORK", location: "MARKET" },
                { start: 18, end: 22, activity: "DRINK", location: "TAVERN" }
            ],
            "Domingo": [
                { start: 9, end: 12, activity: "PRAY", location: "CHURCH" },
                { start: 12, end: 16, activity: "SOCIAL", location: "HOME" }
            ]
        }
    },
    {
        id: "clara",
        name: "Clara",
        role: "villager_f",
        stats: { hunger: 80, energy: 70, social: 80 },
        traits: ["KIND", "PATIENT"],
        relationships: { "marcus": 100, "tomas": 100, "elena": 70 },
        schedule: {
            "default": [
                { start: 7, end: 10, activity: "WORK", location: "HOME" },
                { start: 10, end: 12, activity: "SHOP", location: "MARKET" },
                { start: 14, end: 18, activity: "WORK", location: "HOME" }
            ],
            "Domingo": [
                { start: 9, end: 12, activity: "PRAY", location: "CHURCH" },
                { start: 12, end: 14, activity: "EAT", location: "HOME" }
            ]
        }
    },
    {
        id: "tomas",
        name: "Tomas",
        role: "child",
        schedule: {
            "default": [
                { start: 8, end: 14, activity: "PLAY", location: "PLAZA" },
                { start: 14, end: 18, activity: "WORK", location: "FORGE" } // Helper
            ]
        }
    },
    {
        id: "elena",
        name: "Elena",
        role: "villager_f",
        schedule: {
            "default": [
                { start: 10, end: 24, activity: "WORK", location: "TAVERN" }
            ],
            "Domingo": [
                { start: 10, end: 18, activity: "WORK", location: "TAVERN" }
            ]
        }
    },
    {
        id: "javier",
        name: "Javier",
        role: "blacksmith", // Reusing male worker sprite
        schedule: {
            "default": [
                { start: 6, end: 18, activity: "WORK", location: "FARM" }
            ],
            "Domingo": [
                { start: 9, end: 12, activity: "REST", location: "HOME" }
            ]
        }
    },
    {
        id: "sofia",
        name: "Sofia",
        role: "villager_f",
        schedule: { "default": [{ start: 6, end: 18, activity: "WORK", location: "FARM" }] }
    },
    {
        id: "pedro",
        name: "Pedro",
        role: "child",
        schedule: { "default": [{ start: 8, end: 18, activity: "PLAY", location: "FARM" }] }
    },
    {
        id: "alonso",
        name: "Padre Alonso",
        role: "priest",
        schedule: { "default": [{ start: 6, end: 20, activity: "WORK", location: "CHURCH" }] }
    },
    {
        id: "garrick",
        name: "Garrick",
        role: "blacksmith",
        schedule: {
            "default": [
                { start: 6, end: 12, activity: "HUNT", location: "FOREST" },
                { start: 16, end: 22, activity: "DRINK", location: "TAVERN" }
            ]
        }
    },
    {
        id: "lila",
        name: "Lila",
        role: "child",
        schedule: { "default": [{ start: 8, end: 20, activity: "WANDER", location: "PLAZA" }] }
    },
    {
        id: "rodrigo",
        name: "Rodrigo",
        role: "merchant",
        schedule: { "default": [{ start: 8, end: 18, activity: "WORK", location: "SHOP" }] }
    },
    {
        id: "marta",
        name: "Marta",
        role: "villager_f", // Old variant later
        schedule: { "default": [{ start: 8, end: 12, activity: "WALK", location: "VILLAGE" }] }
    },
    {
        id: "bruno",
        name: "Capitan Bruno",
        role: "guard",
        schedule: { "default": [{ start: 6, end: 18, activity: "PATROL", location: "VILLAGE" }] }
    },
    {
        id: "isabel",
        name: "Isabel",
        role: "villager_f",
        schedule: { "default": [{ start: 5, end: 14, activity: "WORK", location: "BAKERY" }] }
    },
    {
        id: "diego",
        name: "Diego",
        role: "child", // Teen
        schedule: { "default": [{ start: 8, end: 18, activity: "WORK", location: "SHOP" }] }
    },
    {
        id: "ana",
        name: "Ana",
        role: "villager_f",
        schedule: { "default": [{ start: 8, end: 18, activity: "WORK", location: "HOME" }] }
    },
    {
        id: "thomas_old",
        name: "Viejo Tomas",
        role: "blacksmith", // Old man
        schedule: { "default": [{ start: 8, end: 12, activity: "FISH", location: "RIVER" }, { start: 14, end: 18, activity: "TALK", location: "TAVERN" }] }
    },
    {
        id: "lucia",
        name: "Lucia",
        role: "child",
        schedule: { "default": [{ start: 8, end: 18, activity: "PLAY", location: "FARM" }] }
    },
    {
        id: "samuel",
        name: "Samuel",
        role: "blacksmith", // Carpenter
        schedule: { "default": [{ start: 8, end: 18, activity: "WORK", location: "WORKSHOP" }] }
    },
    {
        id: "rosa",
        name: "Rosa",
        role: "villager_f",
        schedule: { "default": [{ start: 10, end: 12, activity: "WALK", location: "CHURCH" }] }
    }
];
