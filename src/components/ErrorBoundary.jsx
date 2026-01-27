// src/components/ErrorBoundary.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

// Fallback UI component with themed styling
function ErrorFallback({ error, resetError, config }) {
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-b ${config.background.gradient} relative overflow-hidden`}>
      {/* Twinkling stars background */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse pointer-events-none"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Error card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative z-10 border-2 border-pink-200">
        {/* Emoji header */}
        <div className="text-6xl mb-4 animate-bounce">😢</div>
        
        {/* Title */}
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
          Oops! Something went wrong
        </h2>
        
        {/* Message */}
        <p className="text-gray-600 mb-6 text-sm">
          Don't worry, your progress is saved.
          <br />
          Try refreshing or go back to the map.
        </p>

        {/* Error details (collapsed by default in production) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 text-left bg-red-50 rounded-xl p-3 text-xs">
            <summary className="cursor-pointer text-red-600 font-semibold">Error Details</summary>
            <pre className="mt-2 text-red-500 overflow-auto max-h-32 whitespace-pre-wrap">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-5 py-2.5 rounded-full bg-gradient-to-b from-blue-400 to-blue-500 text-white font-bold shadow-[0_4px_0_#1e40af] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#1e40af] transition-all flex items-center gap-2"
          >
            <span>🔄</span>
            Try Again
          </button>
          
          <button
            onClick={() => navigate('/map')}
            className="px-5 py-2.5 rounded-full bg-gradient-to-b from-green-400 to-green-500 text-white font-bold shadow-[0_4px_0_#15803d] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#15803d] transition-all flex items-center gap-2"
          >
            <span>🗺️</span>
            Back to Map
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrapper component to provide hooks to the class component
function ErrorBoundaryWrapper({ children, fallback }) {
  const { config } = useTheme();
  
  return (
    <ErrorBoundaryClass config={config} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}

// Class component for error catching
class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error caught by ErrorBoundary:', error);
    console.error('📍 Component stack:', errorInfo?.componentStack);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <ErrorFallback 
          error={this.state.error} 
          resetError={this.resetError}
          config={this.props.config}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryWrapper;
