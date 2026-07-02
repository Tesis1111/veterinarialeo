import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props { children: ReactNode; fallbackMessage?: string; }
interface State { hasError: boolean; error: Error | null; info: ErrorInfo | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[300px] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h2 className="text-gray-800">Se produjo un error en este módulo</h2>
          <p className="text-gray-500 text-sm">
            {this.props.fallbackMessage ?? "Hubo un error inesperado al renderizar esta sección. Por favor, recargá la página o contactá al soporte si el problema persiste."}
          </p>
          {this.state.error && (
            <details className="text-left text-xs text-gray-400 bg-gray-50 p-3 rounded border">
              <summary className="cursor-pointer font-medium text-gray-600">Ver detalle técnico</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">{this.state.error.message}</pre>
              {this.state.info && <pre className="mt-1 whitespace-pre-wrap break-all">{this.state.info.componentStack?.slice(0, 400)}</pre>}
            </details>
          )}
          <Button
            onClick={() => { this.setState({ hasError: false, error: null, info: null }); }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }
}
