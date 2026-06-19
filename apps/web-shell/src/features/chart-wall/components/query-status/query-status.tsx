import "./query-status.css";

type QueryStatusProps = {
  tone: "error" | "info";
  title: string;
  message: string;
};

export function QueryStatus({ tone, title, message }: QueryStatusProps): JSX.Element {
  return (
    <div className={`query-status query-status--${tone}`} role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
