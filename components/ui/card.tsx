import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#343434] bg-[#181818] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_4px_rgba(0,0,0,0.5),0_18px_40px_-16px_rgba(0,0,0,0.95)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pb-2", className)} {...props} />;
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-[family-name:var(--font-display)] text-lg font-bold tracking-wide",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardContent, CardTitle };
