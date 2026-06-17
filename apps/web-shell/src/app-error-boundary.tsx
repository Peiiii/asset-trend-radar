import { Component, type ErrorInfo, type ReactNode } from "react";
import "./app-error-boundary.css";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    error: null
  };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Gold Insights app error", error, errorInfo);
  }

  public render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-error-boundary" role="alert">
        <section className="app-error-boundary__panel">
          <span>运行异常</span>
          <h1>页面遇到了问题</h1>
          <p>当前视图没有正常渲染。数据和本地任务不会因此丢失，可以刷新页面或回到图表墙继续查看。</p>
          <pre>{this.state.error.message}</pre>
          <div className="app-error-boundary__actions">
            <button type="button" onClick={this.handleReload}>
              重新加载
            </button>
            <button type="button" onClick={this.handleGoHome}>
              回到图表墙
            </button>
          </div>
        </section>
      </main>
    );
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.assign("/chart-wall");
  };
}
