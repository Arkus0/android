export class Schedule {
    constructor(profile, scheduleConfig) {
        this.profile = profile;
        // Config format: { 'Monday': [ { start: 6, end: 8, activity: 'EAT', location: 'HOME' } ] }
        this.scheduleConfig = scheduleConfig || {};
    }

    getCurrentSlot(dayName, hour) {
        const daySchedule = this.scheduleConfig[dayName] || this.scheduleConfig['default'];
        if (!daySchedule) return null;

        // Find slot encompassing current hour
        return daySchedule.find(slot => hour >= slot.start && hour < slot.end);
    }

    // Helper to override or add variation can go here
}
