import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  autoComplete?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "id">;

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete = "current-password",
  className,
  disabled,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const describedBy = [
    error ? `${id}-error` : null,
    hint && !error ? `${id}-hint` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px] text-foreground/90">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 rounded-xl border-white/[0.08] bg-white/[0.03] pr-11 text-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:ring-primary/40",
            error && "border-destructive/50 focus-visible:ring-destructive/40",
            className,
          )}
          {...rest}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[12px] text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
