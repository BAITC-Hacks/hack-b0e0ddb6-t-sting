import { useEffect, useId, useRef } from 'react';

/** Browsers tab through a radio group once, at its checked (or first) radio. */
function tabStops(panel: HTMLElement) {
  const controls = [
    ...panel.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]:not(:disabled)',
    ),
  ];
  return controls.filter((control) => {
    if (
      !(control instanceof HTMLInputElement) ||
      control.type !== 'radio' ||
      !control.name
    )
      return true;
    const group = controls.filter(
      (candidate): candidate is HTMLInputElement =>
        candidate instanceof HTMLInputElement &&
        candidate.type === 'radio' &&
        candidate.name === control.name,
    );
    return control === (group.find((radio) => radio.checked) ?? group[0]);
  });
}

export function Modal({
  title,
  onClose,
  children,
  className = '',
  headerActions,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const panel = ref.current!;
    panel.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = tabStops(panel);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', keydown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      panel.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      previous.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal ${className}`}
      >
        <div className="section-heading">
          <h2 id={titleId}>{title}</h2>
          {headerActions}
          <button aria-label="Закрыть диалог" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
