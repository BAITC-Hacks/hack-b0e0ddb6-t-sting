export function Loading({ children }: { children: React.ReactNode }) {
  return (
    <p className="muted loading" role="status">
      <span aria-hidden="true">… </span>
      {children}
    </p>
  );
}
export function Failure({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="failure" role="alert">
      <p>{message}</p>
      <button className="outline" onClick={retry}>
        повторить попытку ↻
      </button>
    </div>
  );
}
