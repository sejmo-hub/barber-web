"use client";

import { useFormStatus } from "react-dom";

// Submit tlačidlo do formulárov so server action: počas odosielania sa
// zablokuje a ukáže pendingText; voliteľný confirm pre deštruktívne akcie.
// Musí byť renderované VNÚTRI <form> (useFormStatus číta stav rodiča).
export function SubmitButton({
  children,
  pendingText,
  confirmMessage,
  className,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  pendingText?: string;
  confirmMessage?: string;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) e.preventDefault();
      }}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? (pendingText ?? "…") : children}
    </button>
  );
}
