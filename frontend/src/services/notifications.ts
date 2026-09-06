import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';
import { useEffect, useState } from 'react';

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  date: Date;
};

// Persistent in-memory history
let history: NotificationRecord[] = [];
let listeners: Array<(history: NotificationRecord[]) => void> = [];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus === 'undetermined') {
    // Phrase demandée par le brief
    await new Promise<void>(resolve => {
      Alert.alert(
        'Notifications',
        'Soyez prévenu dès qu\'un chauffeur accepte',
        [{ text: 'Continuer', onPress: () => resolve() }]
      );
    });
  }

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function notify(title: string, body: string) {
  const hasPerm = await hasNotificationPermission();
  if (!hasPerm) return;

  const id = Math.random().toString(36).substring(7);
  
  const record: NotificationRecord = {
    id,
    title,
    body,
    date: new Date(),
  };
  
  history = [record, ...history];
  emit();

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (err) {
    // Silently ignore if it fails
  }
}

export function openNotificationSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

export function subscribeToNotifications(listener: (history: NotificationRecord[]) => void) {
  listeners.push(listener);
  listener(history);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function emit() {
  for (const listener of listeners) {
    listener(history);
  }
}

/** Hook for UI components to read notification history */
export function useNotificationsHistory() {
  const [items, setItems] = useState<NotificationRecord[]>(history);
  
  useEffect(() => {
    return subscribeToNotifications(setItems);
  }, []);
  
  return items;
}

/** Hook for UI components to read the current OS permission state */
export function useNotificationPermission() {
  const [isGranted, setIsGranted] = useState<boolean>(false);
  
  const check = async () => {
    setIsGranted(await hasNotificationPermission());
  };
  
  useEffect(() => {
    check();
    // In a real app we'd also listen to AppState changes to re-check when returning from settings
  }, []);
  
  return { isGranted, check };
}
