import React from "react";
import { cn } from "../../lib/utils";

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br from-slate-800 to-slate-700 p-6 shadow-xl border-slate-700 transition-all duration-300 hover:shadow-2xl hover:border-slate-600",
        className
      )}
    >
      {children}
    </div>
  );
};
