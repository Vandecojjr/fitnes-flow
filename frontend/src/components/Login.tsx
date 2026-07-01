import React, { useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';
import { Lock, User as UserIcon, Dumbbell } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<{ token: string; user: User }>('/auth/login', {
        usernameOrEmail: username,
        password,
      });
      onLoginSuccess(response.user, response.token);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao entrar. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <div className="glass-premium animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
      }}>
        
        {/* Logo and Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(147, 51, 234, 0.3)',
          }}>
            <Dumbbell size={32} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '2.2rem', background: 'linear-gradient(to right, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Fitness Flow
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Controle seus treinos, tempo e métricas
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Username / Email */}
          <div style={{ position: 'relative' }}>
            <label htmlFor="username">Usuário ou E-mail</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <UserIcon size={18} />
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário ou e-mail"
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '14px', marginTop: '10px' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Apenas usuários cadastrados pela administração possuem acesso.
        </div>

      </div>
    </div>
  );
};
