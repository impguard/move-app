import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEWS_KEY = 'move_app_reviews';
const FIELD_SETTINGS_KEY = 'move_app_field_settings';

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export { REVIEWS_KEY, FIELD_SETTINGS_KEY };
