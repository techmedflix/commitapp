import type { TaskStatus } from '../types';

export const getStatusBadgeClass = (status: TaskStatus): string => {
  switch (status) {
    case 'awaiting_acknowledgement':
      return 'badge-awaiting';
    case 'accepted':
      return 'badge-accepted';
    case 'in_progress':
      return 'badge-in_progress';
    case 'blocked':
      return 'badge-blocked';
    case 'completed':
    default:
      return 'badge-completed';
  }
};

export const getStatusLabel = (status: TaskStatus): string => {
  switch (status) {
    case 'awaiting_acknowledgement':
      return 'Awaiting ack';
    case 'accepted':
      return 'Accepted';
    case 'in_progress':
      return 'In progress';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};

// Date utilities
export const formatDateLabel = (dateStr?: string): { label: string; isOverdue: boolean; isToday: boolean } => {
  if (!dateStr) return { label: 'No deadline', isOverdue: false, isToday: false };

  const target = new Date(dateStr);
  const now = new Date();

  // Strip hours for date comparison
  const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = targetDateOnly.getTime() - nowDateOnly.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Due today', isOverdue: false, isToday: true };
  } else if (diffDays === 1) {
    return { label: 'Due tomorrow', isOverdue: false, isToday: false };
  } else if (diffDays === -1) {
    return { label: 'Overdue 1 day', isOverdue: true, isToday: false };
  } else if (diffDays < -1) {
    return { label: `Overdue ${Math.abs(diffDays)} days`, isOverdue: true, isToday: false };
  } else if (diffDays <= 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return { label: `Due ${dayNames[target.getDay()]}`, isOverdue: false, isToday: false };
  } else {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return { label: `Due ${target.toLocaleDateString(undefined, options)}`, isOverdue: false, isToday: false };
  }
};

// Reference URL metadata extractor
export const getUrlDomainLabel = (url?: string): { label: string; iconType: string } => {
  if (!url) return { label: '', iconType: 'link' };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('slack.com')) return { label: 'Slack', iconType: 'slack' };
    if (host.includes('whatsapp.com') || host.includes('wa.me')) return { label: 'WhatsApp', iconType: 'whatsapp' };
    if (host.includes('docs.google.com') || host.includes('drive.google.com')) return { label: 'Google Docs', iconType: 'google' };
    if (host.includes('figma.com')) return { label: 'Figma', iconType: 'figma' };
    if (host.includes('github.com')) return { label: 'GitHub', iconType: 'github' };
    if (host.includes('atlassian.net') || host.includes('jira.com')) return { label: 'Jira', iconType: 'jira' };
    if (host.includes('notion.so') || host.includes('notion.site')) return { label: 'Notion', iconType: 'notion' };

    return { label: host.replace(/^www\./, ''), iconType: 'link' };
  } catch {
    return { label: 'Reference link', iconType: 'link' };
  }
};

export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSecs < 60) return 'just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
