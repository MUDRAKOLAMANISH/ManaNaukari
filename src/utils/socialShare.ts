/**
 * Auto Job Social Sharing Utility for Mana Naukari
 * Generates formatted social media messages, clipboard copying,
 * and direct links / Telegram Bot API integrations for WhatsApp, Telegram, LinkedIn, X, and Facebook.
 */

export interface ShareableJob {
  id?: string | number;
  title: string;
  company: string;
  location?: string | null;
  experience?: string | null;
  salary?: string | null;
  job_type?: string | null;
  category?: string | null;
  apply_link: string;
  skills_required?: string[] | string | null;
  posted_date?: string | null;
}

export interface TelegramConfig {
  botToken: string;
  channelId: string; // e.g. "@mananaukari_jobs" or "-100123456789"
  autoPostOnPublish: boolean;
}

const STORAGE_KEY_AUTO_SHARE = 'mananaukari_auto_share_enabled';
const STORAGE_KEY_TELEGRAM_CONFIG = 'mananaukari_telegram_config';

/**
 * Gets absolute Mana Naukari URL for a specific job
 */
export function getManaNaukariJobUrl(jobId?: string | number): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mananaukari.in';
  if (!jobId) return origin;
  return `${origin}/jobs/${jobId}`;
}

/**
 * Automatically generates a richly formatted job message including all required fields
 */
export function generateJobSocialMessage(job: ShareableJob): string {
  const jobUrl = getManaNaukariJobUrl(job.id);
  const salaryDisplay = job.salary && job.salary.trim() ? job.salary.trim() : 'Best in Industry';
  const expDisplay = job.experience && job.experience.trim() ? job.experience.trim() : 'Fresher';
  const locDisplay = job.location && job.location.trim() ? job.location.trim() : 'Pan India';
  const catDisplay = job.category && job.category.trim() ? job.category.trim() : 'Software Engineering';
  const jobTypeDisplay = job.job_type && job.job_type.trim() ? job.job_type.trim() : 'Full Time';

  let skillsText = '';
  if (Array.isArray(job.skills_required) && job.skills_required.length > 0) {
    skillsText = `\n🛠️ *Key Skills:* ${job.skills_required.slice(0, 5).join(', ')}`;
  } else if (typeof job.skills_required === 'string' && job.skills_required.trim()) {
    skillsText = `\n🛠️ *Key Skills:* ${job.skills_required.trim()}`;
  }

  return `🚨 *NEW HIRING ALERT - MANA NAUKARI* 🚨

🏢 *Company Name:* ${job.company}
💼 *Job Title:* ${job.title}
📂 *Job Category:* ${catDisplay}
🎯 *Job Type:* ${jobTypeDisplay}
📍 *Location:* ${locDisplay}
🎓 *Experience:* ${expDisplay}
💰 *Salary / CTC:* ${salaryDisplay}${skillsText}

🔗 *Official Apply Link:*
${job.apply_link}

🌐 *View on Mana Naukari Portal:*
${jobUrl}

━━━━━━━━━━━━━━━━━━━━
👉 *Share with friends looking for freshers & tech jobs!*
📢 *Verified authentic opportunity. Zero fees guaranteed.*`;
}

/**
 * Generates concise message optimized for Twitter/X character limits
 */
export function generateTwitterMessage(job: ShareableJob): string {
  const jobUrl = getManaNaukariJobUrl(job.id);
  const salaryText = job.salary ? ` | 💰 ${job.salary}` : '';
  const locText = job.location ? ` | 📍 ${job.location}` : '';
  return `🚨 Hiring Alert: ${job.company} is hiring for ${job.title}!

🎓 Experience: ${job.experience || 'Fresher'}${locText}${salaryText}
📂 Category: ${job.category || 'Jobs'}

Apply now on @ManaNaukari:`;
}

/**
 * Copies formatted job message to clipboard
 */
export async function copyJobMessageToClipboard(job: ShareableJob | string): Promise<boolean> {
  const message = typeof job === 'string' ? job : generateJobSocialMessage(job);
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return true;
    }
  } catch {
    // Fallback using textarea
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = message;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * 1. Share to WhatsApp
 * Copies text and opens WhatsApp Web or App using wa.me
 */
export function openWhatsAppShare(job: ShareableJob, customMessage?: string): void {
  const text = customMessage || generateJobSocialMessage(job);
  copyJobMessageToClipboard(text);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * 2. Share to Telegram (Standard Web Share Dialog)
 */
export function openTelegramShare(job: ShareableJob, customMessage?: string): void {
  const text = customMessage || generateJobSocialMessage(job);
  const jobUrl = getManaNaukariJobUrl(job.id);
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(jobUrl)}&text=${encodeURIComponent(text)}`;
  window.open(telegramUrl, '_blank', 'noopener,noreferrer');
}

/**
 * 3. Send job automatically using Telegram Bot API
 * Posts formatted markdown message directly to the configured Telegram channel
 */
export async function postToTelegramBotApi(
  job: ShareableJob,
  customMessage?: string,
  configOverride?: Partial<TelegramConfig>
): Promise<{ success: boolean; message: string; data?: any }> {
  const config = { ...getTelegramConfig(), ...configOverride };

  if (!config.botToken || !config.botToken.trim()) {
    return {
      success: false,
      message: 'Telegram Bot Token is not configured. Please enter your Bot Token in Telegram settings.',
    };
  }

  if (!config.channelId || !config.channelId.trim()) {
    return {
      success: false,
      message: 'Telegram Channel ID is not configured (e.g. @mananaukari_jobs or -100xxxxxxxxxx).',
    };
  }

  const rawMessage = customMessage || generateJobSocialMessage(job);
  const token = config.botToken.trim();
  const chatId = config.channelId.trim();

  try {
    console.log(`[Telegram Broadcast] Sending job "${job.title}" to channel: ${chatId}`);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: rawMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error('[Telegram API Error]:', data);
      return {
        success: false,
        message: data.description || 'Failed to post message to Telegram channel.',
        data,
      };
    }

    console.log('[Telegram Broadcast Success]:', data.result?.message_id);
    return {
      success: true,
      message: `Successfully posted to Telegram channel (${chatId})!`,
      data: data.result,
    };
  } catch (err: any) {
    console.error('[Telegram Network Exception]:', err);
    return {
      success: false,
      message: err.message || 'Network error connecting to Telegram Bot API.',
    };
  }
}

/**
 * 4. Share to LinkedIn
 */
export function openLinkedInShare(job: ShareableJob): void {
  const jobUrl = getManaNaukariJobUrl(job.id);
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * 5. Share to Twitter / X
 */
export function openTwitterShare(job: ShareableJob, customMessage?: string): void {
  const jobUrl = getManaNaukariJobUrl(job.id);
  const text = customMessage || generateTwitterMessage(job);
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(jobUrl)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * 6. Share to Facebook
 */
export function openFacebookShare(job: ShareableJob): void {
  const jobUrl = getManaNaukariJobUrl(job.id);
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Auto-share preference management
 */
export function getAutoSharePreference(): boolean {
  if (typeof window === 'undefined') return true; // Default to true for maximum convenience
  const val = localStorage.getItem(STORAGE_KEY_AUTO_SHARE);
  return val === null ? true : val === 'true';
}

export function setAutoSharePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AUTO_SHARE, enabled ? 'true' : 'false');
}

/**
 * Telegram Bot & Channel settings management
 */
export function getTelegramConfig(): TelegramConfig {
  if (typeof window === 'undefined') {
    return {
      botToken: '',
      channelId: '',
      autoPostOnPublish: false,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_TELEGRAM_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        botToken: parsed.botToken || '',
        channelId: parsed.channelId || '',
        autoPostOnPublish: Boolean(parsed.autoPostOnPublish),
      };
    }
  } catch {
    // fallback
  }

  return {
    botToken: '',
    channelId: '',
    autoPostOnPublish: false,
  };
}

export function saveTelegramConfig(config: TelegramConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_TELEGRAM_CONFIG, JSON.stringify(config));
}
