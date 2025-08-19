import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "small" | "medium" | "large";
  shadow?: "none" | "small" | "medium" | "large";
  border?: boolean;
  rounded?: "none" | "small" | "medium" | "large" | "full";
  background?: "white" | "gray" | "primary" | "transparent";
  hover?: boolean;
}

function Card({
  children,
  className = "",
  padding = "medium",
  shadow = "small",
  border = true,
  rounded = "medium",
  background = "white",
  hover = false,
}: CardProps) {
  const paddingClasses = {
    none: "",
    small: "p-3",
    medium: "p-6",
    large: "p-8",
  };

  const shadowClasses = {
    none: "",
    small: "shadow-sm",
    medium: "shadow-md",
    large: "shadow-lg",
  };

  const roundedClasses = {
    none: "",
    small: "rounded-sm",
    medium: "rounded-lg",
    large: "rounded-xl",
    full: "rounded-full",
  };

  const backgroundClasses = {
    white: "bg-white",
    gray: "bg-gray-50",
    primary: "bg-primary-50",
    transparent: "bg-transparent",
  };

  const classes = [
    backgroundClasses[background],
    paddingClasses[padding],
    shadowClasses[shadow],
    roundedClasses[rounded],
    border && "border border-gray-200",
    hover && "hover:shadow-md transition-shadow duration-200",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function CardTitle({
  children,
  className = "",
  as: Component = "h3",
}: CardTitleProps) {
  const baseClasses = "font-semibold text-gray-900";

  const sizeClasses = {
    h1: "text-3xl",
    h2: "text-2xl",
    h3: "text-xl",
    h4: "text-lg",
    h5: "text-base",
    h6: "text-sm",
  };

  return (
    <Component
      className={`${baseClasses} ${sizeClasses[Component]} ${className}`}
    >
      {children}
    </Component>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className = "",
}: CardDescriptionProps) {
  return <p className={`text-gray-600 text-sm ${className}`}>{children}</p>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`mt-6 pt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

// Named exports
export { Card };
export default Card;
