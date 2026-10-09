import { ExtensionMessage } from '../shared/messages';

export class TabsManager {
  private managedTabId: number | null = null;

  public getManagedTabId(): number | null {
    return this.managedTabId;
  }

  public setManagedTabId(tabId: number | null): void {
    this.managedTabId = tabId;
  }

  /**
   * Opens or updates the managed study tab with the given URL.
   * If managed tab is still open, navigates it. Otherwise opens a new tab.
   */
  public async openOrUpdateStudyTab(url: string): Promise<number> {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      return 1; // test environment dummy id
    }

    if (this.managedTabId !== null) {
      try {
        const existingTab = await chrome.tabs.get(this.managedTabId);
        if (existingTab && existingTab.id) {
          await chrome.tabs.update(existingTab.id, { url, active: true });
          return existingTab.id;
        }
      } catch {
        // Tab was closed or not found, proceed to create new one
      }
    }

    const newTab = await chrome.tabs.create({ url, active: true });
    if (!newTab.id) {
      throw new Error('Failed to create managed study tab.');
    }
    this.managedTabId = newTab.id;
    return newTab.id;
  }

  /**
   * Safely closes only the managed study tab. Unrelated user tabs are never touched.
   */
  public async closeManagedTab(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs || this.managedTabId === null) {
      return;
    }

    try {
      await chrome.tabs.remove(this.managedTabId);
    } catch {
      // Tab may already have been closed by user
    } finally {
      this.managedTabId = null;
    }
  }

  /**
   * Sends a message to the content script in the managed tab.
   */
  public async sendMessageToManagedTab<T = unknown>(
    message: ExtensionMessage
  ): Promise<T | null> {
    if (typeof chrome === 'undefined' || !chrome.tabs || this.managedTabId === null) {
      return null;
    }

    try {
      const response = await chrome.tabs.sendMessage(this.managedTabId, message);
      return response as T;
    } catch {
      // Content script may not be loaded yet or page is a restricted chrome:// URL
      return null;
    }
  }
}
