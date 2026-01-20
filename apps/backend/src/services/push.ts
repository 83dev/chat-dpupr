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
  roomName: string,
  roomType?: string
): Promise<void> {
  try {
    // Get room type if not provided
    let type = roomType;
    if (!type) {
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { type: true }
      });
      type = room?.type;
    }

    // FIXED: Get all room members with their push tokens in a SINGLE query
    // This eliminates the N+1 query problem
    const membersWithTokens = await prisma.chatRoomMember.findMany({
      where: {
        roomId,
        userNip: { not: senderNip },
        leftAt: null,
      },
      select: {
        userNip: true,
        user: {
          select: {
            pushToken: true,
          },
        },
      },
    });

    // Build messages for members with push tokens
    const messages: PushMessage[] = [];
    
    for (const member of membersWithTokens) {
      const pushToken = member.user.pushToken;
      if (!pushToken) continue;

      let title = roomName;
      let body = messageBody;

      // Chat style formatting
      if (type === 'PRIVATE') {
        // Private chat: Title is sender name, Body is message
        title = senderName;
        body = messageBody;
      } else {
        // Group/Bidang chat: Title is room name, Body is "Sender: Message"
        title = roomName;
        body = `${senderName}: ${messageBody}`;
      }

      // Truncate body if too long
      const truncatedBody = body.length > 200 ? body.substring(0, 200) + '...' : body;

      messages.push({
        to: pushToken,
        title: title,
        body: truncatedBody,
        data: {
          roomId,
          type: 'new_message',
        },
        sound: 'default',
      });
    }

    if (messages.length > 0) {
      await sendPushNotifications(messages);
    }
  } catch (error) {
    console.error('Error notifying room members:', error);
  }
}
