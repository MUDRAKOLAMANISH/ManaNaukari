export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body?: string;
  labelIds?: string[];
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Base64 URL Safe encoding helper for Gmail API MIME format
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const gmailApiService = {
  /**
   * Fetch authenticated user's Gmail profile details
   */
  async getUserProfile(accessToken: string): Promise<GmailUserProfile> {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail Profile API error (${res.status}): ${errText}`);
    }

    return await res.json();
  },

  /**
   * List message headers matching query
   */
  async listMessages(
    accessToken: string,
    maxResults = 10,
    query = ''
  ): Promise<{ messages: GmailMessageSummary[]; resultSizeEstimate: number }> {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', String(maxResults));
    if (query) url.searchParams.set('q', query);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail List Messages API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawList: Array<{ id: string; threadId: string }> = data.messages || [];

    // Fetch full headers for each message in parallel
    const details = await Promise.all(
      rawList.map(async (msg) => {
        try {
          return await this.getMessageDetails(accessToken, msg.id);
        } catch {
          return null;
        }
      })
    );

    const validDetails = details.filter((d): d is GmailMessageSummary => d !== null);

    return {
      messages: validDetails,
      resultSizeEstimate: data.resultSizeEstimate || validDetails.length,
    };
  },

  /**
   * Get single message details (headers, subject, snippet, body)
   */
  async getMessageDetails(accessToken: string, messageId: string): Promise<GmailMessageSummary> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail Message API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const headers: GmailMessageHeader[] = data.payload?.headers || [];

    const getHeader = (name: string): string => {
      const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return found ? found.value : '';
    };

    // Extract body text if available
    let bodyText = data.snippet || '';
    if (data.payload?.parts) {
      const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        try {
          bodyText = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch {
          bodyText = data.snippet || '';
        }
      }
    }

    return {
      id: data.id,
      threadId: data.threadId,
      snippet: data.snippet || '',
      subject: getHeader('Subject') || '(No Subject)',
      from: getHeader('From') || 'Unknown Sender',
      to: getHeader('To') || '',
      date: getHeader('Date') || '',
      body: bodyText,
      labelIds: data.labelIds || [],
    };
  },

  /**
   * Send email using Gmail API
   */
  async sendEmail(
    accessToken: string,
    params: {
      to: string;
      subject: string;
      body: string;
      senderName?: string;
    }
  ): Promise<{ id: string; threadId: string; labelIds: string[] }> {
    const { to, subject, body, senderName } = params;

    // Construct MIME message
    const mimeLines = [
      `To: ${to.trim()}`,
      `Subject: =?utf-8?B?${btoa(encodeURIComponent(subject))}?=`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ];

    if (senderName) {
      mimeLines.unshift(`From: ${senderName} <me>`);
    }

    const mimeMessage = mimeLines.join('\r\n');
    const rawEncoded = base64UrlEncode(mimeMessage);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawEncoded,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail Send API error (${res.status}): ${errText}`);
    }

    return await res.json();
  },

  /**
   * Trash message
   */
  async trashMessage(accessToken: string, messageId: string): Promise<boolean> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.ok;
  },
};
