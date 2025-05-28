import { toastStore } from '@skeletonlabs/skeleton';

export async function executeProcessAndNotify<T>(
  thresholdMillisecs: number, 
  notificationMessage: string,
  asyncProcess: () => Promise<T>
): Promise<T> {
  const granted = await requestNotificationPermission();

  const start = new Date();
  const result = await asyncProcess();
  const timeouts = thresholdMillisecs < (new Date().getTime() - start.getTime());
  if (granted) {
    sendNotification(notificationMessage, timeouts);
  }
  return result;
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

function sendNotification(message: string, timeouts: boolean) {
  if (document.visibilityState === 'visible' || !timeouts) {
    toastStore.trigger({ message, timeout: 3000 });
  } else {
    const n = new Notification(message);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }
}
