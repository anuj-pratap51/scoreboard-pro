import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  BookOpen, LayoutDashboard, FileText, BarChart3, LogOut, Menu, X,
  PlusCircle, ClipboardList, Users
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const studentLinks = [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/exams', icon: FileText, label: 'Available Exams' },
    { to: '/student/results', icon: BarChart3, label: 'My Results' },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/exams', icon: ClipboardList, label: 'Manage Exams' },
    { to: '/admin/create-exam', icon: PlusCircle, label: 'Create Exam' },
    { to: '/admin/results', icon: Users, label: 'Student Results' },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl text-foreground">ExamFlow</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 lg:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <button className="lg:hidden mr-3" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h2 className="font-heading font-semibold text-foreground">
            {role === 'admin' ? 'Admin Panel' : 'Student Portal'}
          </h2>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
