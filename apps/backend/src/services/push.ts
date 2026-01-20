import prisma from '../config/database.js';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  badge?: number;
}

// Send push notification via Expo Push API
export async function sendPushNotification(message: PushMessage): Promise<boolean> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json() as any;
    
    if (result.data?.status === 'ok') {
      return true;
    }
    
    console.log('Push notification response:', result);
    return false;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// Send push notification to multiple users
export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    // Expo recommends sending in batches of 100
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });
    }
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

// Notify room members about a new message
export async function notifyRoomMembers(
  roomId: string,
  senderNip: string,
  senderName: string,
  messageBody: string,
  roomName: string
): Promise<void> {
  try {
    // Get all room members except the sender
    const members = await prisma.chatRoomMember.findMany({
      where: {
        roomId,
        userNip: { not: senderNip },
        leftAt: null,
      },
      include: {
        user: true,
      },
    });

    // Filter members with push tokens and build messages
    const messages: PushMessage[] = [];
    
    for (const member of members) {
      // Access pushToken using raw query to avoid type issues
      const userWithToken = await prisma.user.findUnique({
        where: { nip: member.userNip },
      }) as any;
      
      if (userWithToken?.pushToken) {
        messages.push({
          to: userWithToken.pushToken,
          title: `${senderName} - ${roomName}`,
          body: messageBody.length > 100 ? messageBody.substring(0, 100) + '...' : messageBody,
          data: {
            roomId,
            type: 'new_message',
          },
          sound: 'default',
        });
      }
    }

    if (messages.length > 0) {
      await sendPushNotifications(messages);
    }
  } catch (error) {
    console.error('Error notifying room members:', error);
  }
}
