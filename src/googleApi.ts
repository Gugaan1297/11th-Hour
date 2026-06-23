import { CalendarEvent, EmailMessage } from "./types";

// Base64URL encoding helper for Gmail raw mail
function base64UrlEncode(str: string): string {
  // Use TextEncoder to prevent issues with UTF-8 characters
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = window.btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Fetch calendar events from the Google Calendar API
 */
export async function fetchCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const timeMin = new Date().toISOString();
  // Fetch from primary calendar, only single events ordered by start time
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&maxResults=15&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  const items = data.items || [];
  
  return items.map((item: any) => ({
    id: item.id,
    summary: item.summary || 'Untitled Event',
    description: item.description,
    start: {
      dateTime: item.start?.dateTime,
      date: item.start?.date,
    },
    end: {
      dateTime: item.end?.dateTime,
      date: item.end?.date,
    },
  }));
}

/**
 * Inserts a new focus block / event into Google Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description: string;
    startTime: string; // ISO format
    endTime: string;   // ISO format
  }
): Promise<any> {
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  
  const body = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.startTime,
    },
    end: {
      dateTime: event.endTime,
    },
    reminders: {
      useDefault: true,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Calendar Insert failed: ${errText}`);
  }

  return response.json();
}

/**
 * Fetch direct recent emails from Gmail and decode basic info
 */
export async function fetchGmailMessages(accessToken: string): Promise<EmailMessage[]> {
  // Fetch messages thread list from user's primary mailbox
  const listUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=7';
  const listResponse = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!listResponse.ok) {
    throw new Error(`Gmail List API error: ${listResponse.statusText}`);
  }

  const listData = await listResponse.json();
  const messages = listData.messages || [];

  const parsedMessages: EmailMessage[] = [];

  for (const msgObj of messages) {
    try {
      const msgUrl = `https://www.googleapis.com/gmail/v1/users/me/messages/${msgObj.id}`;
      const msgResponse = await fetch(msgUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!msgResponse.ok) continue;
      const msgData = await msgResponse.json();

      const headers = msgData.payload?.headers || [];
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
      const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || 'No Date';
      const snippet = msgData.snippet || '';

      // Try extraction of actual body text if snippet is too short
      let bodyText = snippet;
      if (msgData.payload?.body?.data) {
        try {
          bodyText = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch {}
      } else if (msgData.payload?.parts) {
        // Attempt to find simple plain text part
        const plainPart = msgData.payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (plainPart?.body?.data) {
          try {
            bodyText = atob(plainPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } catch {}
        }
      }

      parsedMessages.push({
        id: msgData.id,
        threadId: msgData.threadId,
        snippet: snippet,
        subject: subject,
        from: from,
        date: date,
        body: bodyText,
      });
    } catch (e) {
      console.error(`Error parsing message ${msgObj.id}:`, e);
    }
  }

  return parsedMessages;
}

/**
 * Complete Gmail compose and send action using base64Url encoding
 */
export async function sendGmailMessage(
  accessToken: string,
  emailDetails: {
    to: string;
    subject: string;
    body: string;
  }
): Promise<any> {
  const url = 'https://www.googleapis.com/gmail/v1/users/me/messages/send';

  // Format MIME message
  const rawMsgString = 
    `To: ${emailDetails.to}\r\n` +
    `Subject: ${emailDetails.subject}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
    `${emailDetails.body}`;

  const base64Raw = base64UrlEncode(rawMsgString);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Raw,
    }),
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`Gmail Send error: ${errorMsg}`);
  }

  return response.json();
}
