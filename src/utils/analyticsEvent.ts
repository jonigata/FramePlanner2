import { getAnalytics, logEvent } from "firebase/analytics";

export function analyticsEvent(eventName: string) {
  logEvent(getAnalytics(), eventName);
}
