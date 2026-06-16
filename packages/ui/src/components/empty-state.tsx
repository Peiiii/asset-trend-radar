type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps): JSX.Element {
  return (
    <section className="gi-empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
