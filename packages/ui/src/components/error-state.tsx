type ErrorStateProps = {
  title: string;
  message: string;
};

export function ErrorState({ title, message }: ErrorStateProps): JSX.Element {
  return (
    <section className="gi-error-state">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
