import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useCallback, useEffect, useState } from 'react';

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    async function checkPermission() {
      let permission = await isPermissionGranted();
      if (!permission) {
        const response = await requestPermission();
        permission = response === 'granted';
      }
      setHasPermission(permission);
    }
    checkPermission();
  }, []);

  const notify = useCallback(async (title: string, body: string, options?: { icon?: string }) => {
    if (hasPermission) {
      sendNotification({
        title,
        body,
        icon: options?.icon || 'icon',
      });
    }
  }, [hasPermission]);

  /**
   * Helper to check for mentions in a string
   */
  const checkMentions = useCallback((content: string, currentUserEmail: string, currentUserName: string) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex) || [];
    
    // Check if the current user is mentioned (@username or @email_prefix)
    const userIdentifier = currentUserName.toLowerCase().replace(/\s+/g, '');
    const emailPrefix = currentUserEmail.split('@')[0].toLowerCase();
    
    return mentions.some(m => {
      const target = m.slice(1).toLowerCase();
      return target === userIdentifier || target === emailPrefix || target === 'everyone';
    });
  }, []);

  return { notify, checkMentions, hasPermission };
}
