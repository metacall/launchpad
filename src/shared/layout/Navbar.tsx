import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, LogOut, Menu, X, Eye, User } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

const navBtnStyle = {
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-grey)',
  background: 'transparent',
} as React.CSSProperties;

function hoverOn(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'var(--color-text-primary)';
  e.currentTarget.style.color = '#ffffffff';
  e.currentTarget.style.borderColor = 'var(--color-text-primary)';
}
function hoverOff(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'transparent';
  e.currentTarget.style.color = 'var(--color-text-muted)';
  e.currentTarget.style.borderColor = 'var(--color-grey)';
}

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);

  const isSettingsPage = location.pathname.startsWith('/settings');
  const menuOpen = menuOpenForPath === location.pathname;

  return (
    <header className="w-full bg-[--color-surface]">
      <div
        className="flex items-center justify-between w-full mx-auto px-4"
        style={{ minHeight: '5rem', maxWidth: '1200px', padding: '0.75rem 1rem' }}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-start gap-0.5 mt-4 cursor-pointer bg-transparent border-none p-0"
        >
          <img src="/metacall.svg" alt="MetaCall" className="h-8 sm:h-16 w-auto" />
          <span className="font-mono leading-none text-xs text-blue-500">v0.6.0</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Logged-in user */}
          {user && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 select-none"
              title={user.email}
            >
              <User size={15} strokeWidth={2.5} />
              <span className="max-w-40 text-[0.875rem] truncate">{user.email}</span>
            </div>
          )}

          {isSettingsPage ? (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-black text-sm font-semibold transition-colors rounded-sm"
            >
              Deploys <Eye size={16} className="text-gray-600" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150"
              style={navBtnStyle}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              Settings <Settings size={13} strokeWidth={1.8} />
            </button>
          )}

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150"
            style={navBtnStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            Logout <LogOut size={13} strokeWidth={1.8} />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex sm:hidden items-center justify-center w-11 h-11 border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={() =>
            setMenuOpenForPath(current =>
              current === location.pathname ? null : location.pathname,
            )
          }
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200 shadow-sm transition-all duration-150">
          <div className="flex flex-col divide-y divide-gray-100 max-w-300 mx-auto">
            {/* User email on mobile */}
            {user && (
              <div className="flex items-center gap-2 min-h-11 px-5 py-3 text-xs text-gray-500 font-mono">
                <User size={15} strokeWidth={2.5} />
                <span className="truncate text-[0.875rem]">{user.email}</span>
              </div>
            )}

            {isSettingsPage ? (
              <button
                onClick={() => {
                  setMenuOpenForPath(null);
                  navigate('/');
                }}
                className="flex items-center gap-2 min-h-11 px-5 py-3 text-sm text-slate-800 font-medium hover:bg-gray-50 transition-colors text-left"
              >
                <Eye size={15} strokeWidth={2.5} />
                Deploys
              </button>
            ) : (
              <button
                onClick={() => {
                  setMenuOpenForPath(null);
                  navigate('/settings');
                }}
                className="flex items-center gap-2 min-h-11 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors text-left"
              >
                <Settings size={15} strokeWidth={1.8} /> Settings
              </button>
            )}

            <button
              onClick={() => {
                setMenuOpenForPath(null);
                logout();
              }}
              className="flex items-center gap-2 min-h-11 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors text-left"
            >
              <LogOut size={15} strokeWidth={1.8} /> Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
