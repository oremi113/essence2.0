/**
 * Stroked line icons used across the app. Inherit color via currentColor
 * and accept className for sizing/positioning. All icons are aria-hidden
 * by default — wrap with a labeled element for accessibility.
 */
import type { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  strokeWidth?: number;
}

function Icon({
  size = 24,
  strokeWidth = 2,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <polyline points="15 18 9 12 15 6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Icon>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.75} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </Icon>
  );
}

export function MicStopIcon(props: IconProps) {
  return (
    <Icon fill="currentColor" stroke="none" viewBox="0 0 20 20" {...props}>
      <rect x="2" y="2" width="16" height="16" rx="3" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.5} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

/* ── Step 6 message-category icons (A3 category selector) ──
 * Ported verbatim from prototypes/message creation/essence-step6-a3.html.
 * Stroke 1.5 to read as quiet line-art inside the 44px card tiles. */

export function CakeIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5A2.5 2.5 0 0 1 7.5 2C10 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C14 2 12 7 12 7z" />
    </Icon>
  );
}

export function AwardIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.9" y1="4.9" x2="6.3" y2="6.3" />
      <line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.9" y1="19.1" x2="6.3" y2="17.7" />
      <line x1="17.7" y1="6.3" x2="19.1" y2="4.9" />
    </Icon>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <path d="M6 2h12" />
      <path d="M6 22h12" />
      <path d="M6 2v4a6 6 0 0 0 6 6 6 6 0 0 0 6-6V2" />
      <path d="M6 22v-4a6 6 0 0 1 6-6 6 6 0 0 1 6 6v4" />
    </Icon>
  );
}

export function MugIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
      <path d="M16 12h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 5c0-1 1-1 1-2M11 5c0-1 1-1 1-2" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </Icon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </Icon>
  );
}
