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
    // Matches @name or @name_prefix
    const mentionRegex = /@(\w+|"[\w\s]+")|@everyone/gi;
    const mentions = content.match(mentionRegex) || [];
    
    console.log('Checking mentions in:', content, 'Mentions found:', mentions);

    const userIdentifier = currentUserName.toLowerCase().replace(/\s+/g, '');
    const emailPrefix = currentUserEmail.split('@')[0].toLowerCase();
    
    const isMentioned = mentions.some(m => {
      const target = m.slice(1).toLowerCase().replace(/"/g, '');
      return target === userIdentifier || target === emailPrefix || target === 'everyone';
    });

    console.log('Is current user mentioned?', isMentioned);
    return isMentioned;
  }, []);

  return { notify, checkMentions, hasPermission };
}
