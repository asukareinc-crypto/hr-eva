import Link from "next/link";

const inputBase =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-slate-900";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${inputBase} ${className}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${inputBase} min-h-[80px] ${className}`} />;
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
) {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`${inputBase} ${className}`} />;
}

export function Btn({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "bg-white border border-slate-300 text-slate-800 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-500",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkBtn({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "bg-white border border-slate-300 text-slate-800 hover:bg-slate-50",
  };
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "yellow" | "blue" | "red";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center">
      {message}
    </div>
  );
}
