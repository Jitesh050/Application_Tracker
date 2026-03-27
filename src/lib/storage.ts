import { JobApplication, ChatMessage } from '../types';

const STORAGE_KEY_APPS = 'job_tracker_apps';
const STORAGE_KEY_CHAT = 'job_tracker_chat';

export function getApplications(): JobApplication[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_APPS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse applications from local storage", e);
    return [];
  }
}

export function saveApplications(apps: JobApplication[]) {
  localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(apps));
}

export function getChatHistory(): ChatMessage[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CHAT);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse chat history from local storage", e);
    return [];
  }
}

export function saveChatHistory(chat: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(chat));
}
