export const DEADLINE_ALARM_NAME = 'b2b_deadline_alarm';

export class AlarmsManager {
  /**
   * Schedules an alarm to wake the service worker at the exact deadline epoch ms.
   */
  static async scheduleDeadlineAlarm(deadline: number): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.alarms) {
      return;
    }

    await this.clearDeadlineAlarm();
    // In MV3, alarms with 'when' can be scheduled for a future timestamp.
    // If deadline is in the past or immediately imminent, set for now + 100ms.
    const scheduledTime = Math.max(Date.now() + 100, deadline);
    chrome.alarms.create(DEADLINE_ALARM_NAME, {
      when: scheduledTime,
    });
  }

  /**
   * Clears any active deadline alarm.
   */
  static async clearDeadlineAlarm(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.alarms) {
      return;
    }

    try {
      await chrome.alarms.clear(DEADLINE_ALARM_NAME);
    } catch {}
  }
}
