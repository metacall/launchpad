import { clsx } from 'clsx';
import { Spinner } from './Spinner';

/**
 * Unified Loading States Module
 * SVGLoader, PageLoading, InlineLoading, LoadingOverlay, SkeletonLoader, CompactLoading
 */
interface SVGLoaderProps {
  variant?: 'minimal' | 'gradient';
  size?: number;
  className?: string;
}

interface LoadingStateProps {
  variant?: 'page' | 'inline' | 'overlay' | 'skeleton';
  message?: string;
  spinnerSize?: number;
  className?: string;
  skeletonLines?: number;
  useSVG?: boolean;
  svgVariant?: 'minimal' | 'gradient';
}

export function SVGLoader({ variant = 'gradient', size = 80, className }: SVGLoaderProps) {
  const loaderMap: Record<string, string> = {
    minimal: '/loader-minimal.svg',
    gradient: '/loader-gradient.svg',
  };

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={loaderMap[variant]}
        alt="Loading..."
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

/** Full-screen loading for initial page loads (> 1 second wait) */
export function PageLoading({
  message = 'Loading…',
  spinnerSize = 28,
  className,
  useSVG = true,
  svgVariant = 'gradient',
}: LoadingStateProps) {
  return (
    <div className={clsx('flex items-center justify-center min-h-screen bg-white', className)}>
      <div className="flex flex-col items-center gap-6">
        {useSVG ? (
          <SVGLoader variant={svgVariant} size={120} />
        ) : (
          <Spinner size={spinnerSize} className="text-gray-400" />
        )}
        {message && <p className="text-sm font-medium text-gray-500">{message}</p>}
      </div>
    </div>
  );
}

/** Inline loading indicator (300ms - 1 second wait) */
export function InlineLoading({
  message = 'Loading…',
  spinnerSize = 14,
  className,
  useSVG = false,
  svgVariant = 'minimal',
}: LoadingStateProps) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {useSVG ? (
        <SVGLoader variant={svgVariant} size={16} />
      ) : (
        <Spinner size={spinnerSize} className="text-gray-400" />
      )}
      {message && <span className="text-xs font-medium text-gray-500">{message}</span>}
    </div>
  );
}

/** Semi-transparent overlay that blocks content (1-3 seconds wait) */
export function LoadingOverlay({
  message = 'Syncing…',
  spinnerSize = 16,
  className,
  useSVG = false,
  svgVariant = 'minimal',
}: LoadingStateProps) {
  return (
    <div
      className={clsx(
        'absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50',
        className
      )}
    >
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center gap-4 shadow-lg">
        {useSVG ? (
          <SVGLoader variant={svgVariant} size={32} />
        ) : (
          <Spinner size={spinnerSize} className="text-gray-400" />
        )}
        {message && <span className="text-sm font-medium text-gray-600">{message}</span>}
      </div>
    </div>
  );
}

/** Skeleton placeholder that mimics content shape (300ms - 1 second wait) */
export function SkeletonLoader({ skeletonLines = 3, className }: LoadingStateProps) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: skeletonLines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{
            width: i === skeletonLines - 1 ? '80%' : '100%',
            animation: `pulse ${1.5 + i * 0.1}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** Minimal spinner for button states and tight spaces */
export function CompactLoading({ spinnerSize = 12, className }: LoadingStateProps) {
  return <Spinner size={spinnerSize} className={clsx('text-gray-400', className)} />;
}

/** Post-auth credential checking */
export const AuthLoadingPattern = () => (
  <PageLoading message="Checking credentials…" useSVG svgVariant="gradient" />
);

/** Route lazy loading (Suspense fallback) */
export const RouteLoadingPattern = () => (
  <div className="grow flex items-center justify-center min-h-[50vh] bg-white">
    <div className="flex flex-col items-center gap-4">
      <SVGLoader variant="minimal" size={60} />
      <span className="text-sm font-medium text-gray-500">Loading…</span>
    </div>
  </div>
);

/** Data fetching at page top */
export const SyncLoadingPattern = () => (
  <InlineLoading message="Fetching deployments…" />
);

/** Content sync overlay */
export const TableSyncPattern = () => (
  <LoadingOverlay message="Syncing network…" />
);

/** File processing (ZIP, uploads) */
export const FileProcessingPattern = (message = 'Processing…') => (
  <div className="flex flex-col items-center gap-3">
    <SVGLoader variant="minimal" size={40} />
    <span className="text-sm text-gray-500">{message}</span>
  </div>
);
