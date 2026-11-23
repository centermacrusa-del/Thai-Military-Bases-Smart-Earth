import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'មានបញ្ហាបច្ចេកទេសមិនរំពឹងទុក។',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application boundary caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#07090E] text-slate-100 p-6">
          <div className="max-w-md w-full rounded-xl bg-[#0D131F] border border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <AlertTriangle className="w-9 h-9 text-amber-400 mx-auto" />
            <div className="space-y-1.5">
              <h1 className="text-base font-semibold text-slate-50">
                ប្រព័ន្ធបានជួបប្រទះបញ្ហាបណ្តោះអាសន្ន
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">{this.state.message}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ផ្ទុកកម្មវិធីឡើងវិញ</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
