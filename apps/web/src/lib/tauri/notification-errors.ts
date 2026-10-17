// Keep the existing class name for callers; both desktop senders use this error.
export class MacOSNotificationUpdateRequiredError extends Error {
  constructor(cause: unknown) {
    super('Update Fintail to receive desktop notifications.', { cause });
    this.name = 'MacOSNotificationUpdateRequiredError';
  }
}
