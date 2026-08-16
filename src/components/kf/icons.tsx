import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, className, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
    ...props,
  };
}

export function LeafIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 19c8-1 12-7 13-14-6 2-11 6-13 14Z" />
      <path d="M8 14c2-2 5-4 9-5" />
    </svg>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, size: props.size ?? 20 })}>
      <path d="M12 20V10" />
      <path d="M12 14c-3.2-1.2-5-3.8-5.5-7 3.5.4 6 2.4 7.2 5.2" />
      <path d="M12 12.5c2.8-.8 4.8-2.8 5.8-5.8-3 .8-5 2.6-5.8 5.8Z" />
    </svg>
  );
}

export function ScanIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4H5a1 1 0 0 0-1 1v2" />
      <path d="M17 4h2a1 1 0 0 1 1 1v2" />
      <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M17 20h2a1 1 0 0 0 1-1v-2" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, strokeWidth: 0 })} fill="currentColor" stroke="none">
      <path d="M12 2.5 13.7 8.3 19.5 10 13.7 11.7 12 17.5 10.3 11.7 4.5 10 10.3 8.3 12 2.5Z" />
      <path d="M18.2 14.2 19 16.5 21.3 17.3 19 18.1 18.2 20.4 17.4 18.1 15.1 17.3 17.4 16.5 18.2 14.2Z" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.5" r="3.2" />
      <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
    </svg>
  );
}

export function ChefHatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 11.5c-1.4 0-2.5-1.2-2.5-2.7S5.1 6 6.5 6c.3-1.7 1.8-3 3.6-3 1.2 0 2.3.6 2.9 1.5C13.6 3.6 14.7 3 15.9 3c1.8 0 3.3 1.3 3.6 3 1.4 0 2.5 1.3 2.5 2.8s-1.1 2.7-2.5 2.7" />
      <path d="M7 11.5v6.2c0 .7.6 1.3 1.3 1.3h7.4c.7 0 1.3-.6 1.3-1.3v-6.2" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.8" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5h2l1.4 9.2a1.5 1.5 0 0 0 1.5 1.3h7.8a1.5 1.5 0 0 0 1.5-1.2L19.5 8H7" />
      <circle cx="10" cy="19" r="1.2" />
      <circle cx="16.5" cy="19" r="1.2" />
    </svg>
  );
}

export function JarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4h6v2.5H9V4Z" />
      <path d="M8 6.5h8l-.6 12.2a1.8 1.8 0 0 1-1.8 1.6H10.4a1.8 1.8 0 0 1-1.8-1.6L8 6.5Z" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 4.5 20.5 19.5" />
      <path d="M9.2 9.4A3 3 0 0 0 12 15a3 3 0 0 0 2.7-1.7" />
      <path d="M6.2 6.8C4 8.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.4 4.5-1" />
      <path d="M12.8 6.6c2.8.3 5.4 2.2 8.2 5.4-.5.7-1.1 1.4-1.8 2" />
    </svg>
  );
}
