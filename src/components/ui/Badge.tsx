import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Support both `tone` (legacy) and `variant` (new) props
type Tone = 'default' | 'neutral' | 'blue' | 'green' | 'yellow' | 'amber' | 'red' | 'gray' | 'purple';

const tones: Record<Tone, string> = {
  default:  'bg-ink-100 text-ink-700 border-ink-200',
  neutral:  'bg-ink-100 text-ink-700 border-ink-200',
  blue:     'bg-primary-50 text-primary-700 border-primary-200',
  green:    'bg-green-50 text-green-700 border-green-200',
  yellow:   'bg-amber-50 text-amber-700 border-amber-200',
  amber:    'bg-amber-50 text-amber-700 border-amber-200',
  red:      'bg-red-50 text-red-700 border-red-200',
  gray:     'bg-ink-200 text-ink-800 border-ink-300',
  purple:   'bg-purple-50 text-purple-700 border-purple-200',
};

export function Badge({
  tone,
  variant,
  className,
  children,
}: {
  tone?: Tone;
  variant?: Tone;
  className?: string;
  children: ReactNode;
}) {
  const resolved = tone ?? variant ?? 'default';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
        tones[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ value, kind }: { value: string; kind?: 'case' | 'task' | 'doc' | 'event' | 'priority' }) {
  const v = value.toUpperCase();
  let tone: Tone = 'default';
  if (kind === 'priority') {
    if (v === 'URGENT') tone = 'red';
    else if (v === 'HIGH') tone = 'amber';
    else if (v === 'MEDIUM') tone = 'blue';
    else tone = 'gray';
  } else if (kind === 'case') {
    if (v === 'OPEN') tone = 'green';
    else if (v === 'ON_HOLD') tone = 'amber';
    else if (v === 'CLOSED') tone = 'gray';
    else if (v === 'ARCHIVED') tone = 'neutral';
  } else if (kind === 'task') {
    if (v === 'TODO') tone = 'blue';
    else if (v === 'IN_PROGRESS') tone = 'amber';
    else if (v === 'DONE') tone = 'green';
    else if (v === 'BLOCKED') tone = 'red';
  } else if (kind === 'doc') {
    if (v === 'DRAFT') tone = 'blue';
    else if (v === 'REVIEW') tone = 'amber';
    else if (v === 'FINAL') tone = 'green';
    else if (v === 'ARCHIVED') tone = 'neutral';
  } else if (kind === 'event') {
    if (v === 'HEARING') tone = 'red';
    else if (v === 'MEETING') tone = 'blue';
    else if (v === 'FILING_DEADLINE') tone = 'amber';
    else if (v === 'REMINDER') tone = 'purple';
  }
  return <Badge tone={tone}>{value.replace(/_/g, ' ').toLowerCase()}</Badge>;
}
