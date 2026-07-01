import { useState, useEffect } from 'react';
import type { User } from './types';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { WorkoutTimer } from './components/WorkoutTimer';
import { ManageWorkouts } from './components/ManageWorkouts';
import { ManageUsers } from './components/ManageUsers';
import { WorkoutCalendar } from './components/WorkoutCalendar';
import { Metrics } from './components/Metrics';
import { api } from './services/api';
import { 
  Dumbbell, 
  TrendingUp, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X,
  ShieldAlert,
  Activity,
  Calendar
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<string>('dashboard');
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingActiveSession, setCheckingActiveSession] = useState(false);

  // Load user details from Local Storage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }

    // Handler to detect when API service clears storage (e.g. 401 Unauthorized)
    const handleAuthChange = () => {
      setUser(null);
      setToken(null);
      setView('dashboard');
      setActiveWorkoutId(null);
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // Check for existing active workout session on login/startup
  useEffect(() => {
    if (!token || !user) return;

    const checkActiveSession = async () => {
      try {
        setCheckingActiveSession(true);
        const active = await api.get<any>('/sessions/active');
        if (active && active.workoutId) {
          setActiveWorkoutId(active.workoutId);
          setView('workout-timer');
        }
      } catch (err) {
        // No active session, do nothing
      } finally {
        setCheckingActiveSession(false);
      }
    };

    checkActiveSession();
  }, [token, user]);

  const handleLoginSuccess = (newUser: User, newToken: string) => {
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('token', newToken);
    setUser(newUser);
    setToken(newToken);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setView('dashboard');
    setActiveWorkoutId(null);
  };

  const handleStartWorkout = (workoutId: string) => {
    setActiveWorkoutId(workoutId);
    setView('workout-timer');
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar Links
  const navLinks = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, role: 'All' },
    { id: 'calendar', label: 'Calendário', icon: Calendar, role: 'All' },
    { id: 'metrics', label: 'Métricas e Histórico', icon: TrendingUp, role: 'All' },
    { id: 'manage-workouts', label: user.role === 'Admin' ? 'Gerenciar Treinos' : 'Montar Meu Treino', icon: Dumbbell, role: 'All' },
    { id: 'manage-users', label: 'Cadastrar Usuários', icon: Users, role: 'Admin' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="glass" style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid var(--border-color)',
        borderRadius: 0, background: 'var(--header-bg)'
      }}>
        
        {/* Left: Brand logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none', border: 'none', color: 'var(--header-text)', cursor: 'pointer',
              display: 'block', padding: '4px'
            }}
            className="md-hide-menu"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#ffffff" size={24} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--header-text)' }}>Fitness Flow</h1>
          </div>
        </div>

        {/* Right: User menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--header-text)' }}>{user.username}</span>
            <span className={user.role === 'Admin' ? 'badge badge-admin' : 'badge badge-user'} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
              {user.role === 'Admin' ? 'Administrador' : 'Aluno'}
            </span>
          </div>
          
          <div style={{ height: '30px', width: '1px', background: 'rgba(255, 255, 255, 0.25)' }} />
          
          <button 
            onClick={handleLogout} 
            className="btn" 
            style={{ 
              padding: '8px 12px', 
              fontSize: '0.85rem',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)'
            }}
            title="Sair da Conta"
          >
            <LogOut size={14} />
            <span className="sm-hide-text">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        
        {/* Navigation Sidebar */}
        <aside 
          className={`glass sidebar-nav ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: '260px',
            borderRight: '1px solid var(--border-color)',
            borderTop: 'none', borderBottom: 'none', borderLeft: 'none', borderRadius: 0,
            padding: '24px 16px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            transition: 'transform 0.3s ease',
            background: 'var(--sidebar-bg)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>
            Menu Principal
          </div>

          {navLinks
            .filter(link => link.role === 'All' || (link.role === 'Admin' && user.role === 'Admin'))
            .map(link => {
              const Icon = link.icon;
              const active = view === link.id || (link.id === 'dashboard' && view === 'workout-timer');
              return (
                <button
                  key={link.id}
                  onClick={() => { setView(link.id); setSidebarOpen(false); }}
                  className="btn"
                  style={{
                    justifyContent: 'flex-start',
                    background: active ? 'var(--primary-glow)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: active ? '1px solid var(--card-border-hover)' : '1px solid transparent',
                    padding: '12px 14px',
                    width: '100%',
                    fontSize: '0.92rem'
                  }}
                >
                  <Icon size={18} color={active ? 'var(--primary-hover)' : 'var(--text-muted)'} />
                  {link.label}
                </button>
              );
            })}

          {user.role === 'Admin' && (
            <div style={{ 
              marginTop: 'auto', 
              background: 'var(--primary-glow)', 
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontSize: '0.8rem', fontWeight: 600 }}>
                <ShieldAlert size={14} />
                Área Administrativa
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Como administrador, você pode planejar fichas de treinos personalizadas e gerenciar cadastros de novos usuários.
              </p>
            </div>
          )}
        </aside>

        {/* Content Section */}
        <main className="app-main">
          
          {checkingActiveSession ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Recuperando seu progresso...</p>
            </div>
          ) : (
            <>
              {view === 'dashboard' && (
                <Dashboard 
                  onStartWorkout={handleStartWorkout} 
                  onNavigate={setView}
                />
              )}

              {view === 'workout-timer' && (
                <WorkoutTimer 
                  workoutId={activeWorkoutId!} 
                  onSessionComplete={() => setView('metrics')}
                  onCancel={() => setView('dashboard')}
                />
              )}

              {view === 'manage-workouts' && (
                <ManageWorkouts />
              )}

              {view === 'manage-users' && user.role === 'Admin' && (
                <ManageUsers />
              )}

              {view === 'metrics' && (
                <Metrics />
              )}

              {view === 'calendar' && (
                <WorkoutCalendar />
              )}
            </>
          )}

        </main>

      </div>
      
      {/* Dynamic responsive styles */}
      <style>{`
        .sidebar-nav {
          position: relative;
          transform: none;
        }
        
        .md-hide-menu {
          display: none !important;
        }

        @media (max-width: 768px) {
          .sidebar-nav {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
            z-index: 99;
          }
          
          .sidebar-nav.open {
            transform: translateX(0);
          }

          .md-hide-menu {
            display: block !important;
          }
          
          .grid-layout-md {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .sm-hide-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
