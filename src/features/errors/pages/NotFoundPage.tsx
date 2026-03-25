import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      {/* 404 visual */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-[80px] font-black text-slate-200 leading-none select-none">404</span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-800">Page not found</h1>
          <p className="text-sm text-slate-500 max-w-xs">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={14} />
          Go back
        </button>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Home size={14} />
          Dashboard
        </button>
      </div>
    </div>
  );
}
