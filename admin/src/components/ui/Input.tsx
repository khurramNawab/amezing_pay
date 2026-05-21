import * as React from "react";
import { cn } from "@/components/ui/cn";

export function Input({
  className,
  type,
  onChange,
  value,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      // Strip leading zeros unless it's just "0"
      e.target.value = e.target.value.replace(/^0+(?=\d)/, "");
      // Prevent negative (though min=0 handles it, this is extra safe)
      if (Number(e.target.value) < 0) e.target.value = "0";
    }
    onChange?.(e);
  };

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-text placeholder:text-text-muted shadow-sm " +
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
        className,
      )}
      {...props}
    />
  );
}

