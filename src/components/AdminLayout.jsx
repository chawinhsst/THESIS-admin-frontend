// admin-frontend/src/components/AdminLayout.jsx
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiUsers, FiLogOut, FiActivity, FiChevronsLeft, FiMenu, FiX } from 'react-icons/fi';

// This component is now separate to be reused by both desktop and mobile sidebars
const SidebarContent = ({ isCollapsed, onLinkClick }) => (
  <>
    {/* Header */}
    <div className="flex h-14 items-center border-b border-slate-700 px-4 lg:h-[60px]">
      <div className="flex w-full items-center gap-2 text-lg font-semibold text-white">
        <FiActivity className={`h-6 w-6 shrink-0 transition-transform duration-500 ${isCollapsed ? 'mx-auto' : 'mx-0'} text-sky-400`} />
        <span className={`whitespace-nowrap transition-opacity ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          HR Anomaly
        </span>
      </div>
    </div>
    {/* Nav */}
    <nav className="flex-1 space-y-2 px-2 py-4 text-sm font-medium lg:px-4">
      <NavItem to="/dashboard" icon={FiGrid} isCollapsed={isCollapsed} onClick={onLinkClick}>
        Dashboard
      </NavItem>
      <NavItem to="/volunteers" icon={FiUsers} isCollapsed={isCollapsed} onClick={onLinkClick}>
        Volunteers
      </NavItem>
    </nav>
  </>
);

const NavItem = ({ to, children, icon: Icon, isCollapsed, onClick }) => (
  <div className="group relative">
    <NavLink
      to={to}
      onClick={onClick} // Close mobile menu on link click
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-white hover:bg-slate-700 ${
          isActive ? 'bg-sky-500/20 text-white' : 'text-slate-400'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={`flex-1 whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
    </NavLink>
    {isCollapsed && (
      <div className="absolute left-full top-1/2 z-20 ml-4 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {children}
      </div>
    )}
  </div>
);

export default function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  // State for desktop sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  // State for mobile sidebar
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* --- MOBILE SIDEBAR --- */}
      <div
        className={`fixed inset-0 z-40 flex md:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Overlay */}
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Drawer */}
        <div
          className={`relative flex h-full w-64 max-w-[calc(100%-3rem)] flex-col bg-slate-800 transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent isCollapsed={false} onLinkClick={() => setIsMobileMenuOpen(false)} />
        </div>
      </div>

      {/* --- DESKTOP SIDEBAR & MAIN CONTENT --- */}
      <div
        className={`grid min-h-screen w-full transition-[grid-template-columns] duration-300 ease-in-out ${
          isCollapsed
            ? 'md:grid-cols-[72px_1fr]'
            : 'md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]'
        }`}
      >
        {/* Desktop Sidebar */}
        <div className="hidden border-r bg-slate-800 md:flex md:flex-col">
          <SidebarContent isCollapsed={isCollapsed} />
          <div className="mt-auto border-t border-slate-700 p-2 lg:p-4">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-400 transition-all hover:text-white hover:bg-slate-700">
              <FiChevronsLeft className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isCollapsed && 'rotate-180'}`} />
              <span className={`whitespace-nowrap transition-opacity ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>Collapse</span>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6">
            {/* Hamburger Menu Button (Mobile Only) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation menu"
            >
              <FiMenu className="h-5 w-5" />
            </button>

            <div className="w-full flex-1">
              {/* Page title or search can go here */}
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-rose-100 hover:text-rose-700 transition-colors"
            >
              <FiLogOut />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </header>
          <Outlet />
        </div>
      </div>
    </>
  );
}