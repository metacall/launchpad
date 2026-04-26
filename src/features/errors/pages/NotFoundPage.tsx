import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(70vh-10px)] sm:min-h-[70vh] px-4 bg-white">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-lg">
          <img src="/logo.svg" alt="MetaCall Hub logo" className="h-14 w-14 object-contain" />
          <span className=' text-xl font-[600]' >MetaCall Dashboard</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="text-6xl font-[500] text-slate-900">404</div>
          <div className="hidden sm:block h-12 w-px bg-slate-200" />
          <div className="text-center sm:text-left space-y-1 max-w-xl">
            <h1 className="text-2xl sm:text-5xl font-[400] text-slate-900">Page not found</h1>
            <p className="text-[18px] text-slate-500">
              The page you&apos;re looking for doesn&apos;t exist or may have moved.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-slate-800 transition-colors cursor-pointer Check out our"
        >
          <Home size={14} />
          Go back home
        </button>
      </div>
    </div>
  );
}
