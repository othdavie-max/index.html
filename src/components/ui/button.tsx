"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline-light";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-gold-500 text-white hover:bg-gold-600 shadow-sm shadow-gold-500/20",
  secondary: "bg-transparent text-ink-900 border border-ink-900/20 hover:border-ink-900 hover:bg-ink-900/5",
  ghost: "bg-transparent text-ink-900 hover:bg-ink-900/5",
  "outline-light": "bg-transparent text-white border border-white/30 hover:border-white hover:bg-white/10",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm md:text-base",
  lg: "px-8 py-4 text-base md:text-lg",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
  magnetic?: boolean;
}

interface ButtonAsButton extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  href?: undefined;
}

interface ButtonAsLink extends CommonProps {
  href: string;
  target?: string;
  rel?: string;
}

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, children, icon, magnetic = false, ...props },
  ref,
) {
  const classes = cn(base, variantClasses[variant], sizeClasses[size], className);
  const content = (
    <>
      {children}
      {icon}
    </>
  );

  const MotionComp = magnetic ? motion.span : "span";
  const motionProps = magnetic
    ? {
        whileHover: { scale: 1.03 },
        whileTap: { scale: 0.97 },
        transition: { type: "spring" as const, stiffness: 400, damping: 20 },
        className: "contents",
      }
    : { className: "contents" };

  if ("href" in props && props.href) {
    const { href, target, rel } = props;
    return (
      <MotionComp {...motionProps}>
        <Link href={href} target={target} rel={rel} className={classes}>
          {content}
        </Link>
      </MotionComp>
    );
  }

  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <MotionComp {...motionProps}>
      <button ref={ref} className={classes} {...buttonProps}>
        {content}
      </button>
    </MotionComp>
  );
});
