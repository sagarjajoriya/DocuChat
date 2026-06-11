import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function UploadIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="M12 16V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 8.5 12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16.5v1A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SendIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="m21 3-9.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m21 3-6 18-3.5-7.5L4 10l17-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 7 7 18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l.5-11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function RefreshIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="M20 11a8 8 0 1 0-2.34 5.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 5v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FileIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="M8 3.5h5.5L19 9v10.5A1.5 1.5 0 0 1 17.5 21h-9A1.5 1.5 0 0 1 7 19.5v-14A2 2 0 0 1 9 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 3.8V9h5.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
      <path d="M10.3 4.84 3.78 16.2A2 2 0 0 0 5.52 19h12.96a2 2 0 0 0 1.74-2.8L13.7 4.84a2 2 0 0 0-3.48 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function MoonIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <path d="M20 15.2A8 8 0 1 1 8.8 4 6.8 6.8 0 0 0 20 15.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function SunIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className)} {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84 5.28 5.28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
