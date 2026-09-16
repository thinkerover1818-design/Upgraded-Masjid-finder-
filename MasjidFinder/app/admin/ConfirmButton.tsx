"use client";

export default function ConfirmButton({ name, value, message, children, className }: { name: string; value: string; message: string; children: React.ReactNode; className?: string }) {
  return <button type="submit" name={name} value={value} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }} className={className}>{children}</button>;
}