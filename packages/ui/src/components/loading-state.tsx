export function LoadingState(): JSX.Element {
  return (
    <section className="gi-loading-state" aria-live="polite">
      <span className="gi-loading-state__dot" />
      <p>正在拉取真实行情并计算指标</p>
    </section>
  );
}
