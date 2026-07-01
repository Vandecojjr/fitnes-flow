import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User } from '../types';
import { Plus, Trash2, Shield, User as UserIcon, Mail, Calendar, UserCheck } from 'lucide-react';

export const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create User Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'User'>('User');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch (err: any) {
      setError('Erro ao buscar lista de usuários.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !email || !password) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    try {
      const newUser = await api.post<User>('/users', {
        username,
        email,
        password,
        role,
      });

      setUsers(prev => [newUser, ...prev]);
      
      // Reset Form
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('User');
      setIsCreating(false);
      setSuccess(`Usuário "${newUser.username}" cadastrado com sucesso!`);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar usuário.');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id === id) {
      setError('Não é possível excluir o próprio usuário que está logado.');
      return;
    }

    if (!confirm(`Deseja realmente excluir o usuário "${name}"? Todos os treinos, históricos e metas dele serão perdidos de forma permanente.`)) return;

    setError('');
    setSuccess('');

    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setSuccess(`Usuário "${name}" excluído com sucesso.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir usuário.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando lista de usuários...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Gerenciar Usuários</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Crie contas para novos alunos/parceiros ou conceda acesso administrativo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(!isCreating)}>
          <Plus size={16} />
          {isCreating ? 'Ver Lista' : 'Novo Usuário'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '12px', borderRadius: '8px' }}>
          {success}
        </div>
      )}

      {isCreating ? (
        /* Create User Form */
        <div className="glass" style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={20} color="var(--primary-hover)" />
            Cadastrar Novo Usuário
          </h3>
          
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="reg-username">Nome de Usuário</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <UserIcon size={16} />
                </span>
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome do usuário"
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email">Endereço de E-mail</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Mail size={16} />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aluno@fitnessflow.com"
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password">Senha de Acesso</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha temporária (ex: 123456)"
                required
              />
            </div>

            <div>
              <label>Nível de Acesso (Cargo)</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'Admin' | 'User')}>
                <option value="User">Usuário Comum (Alunos)</option>
                <option value="Admin">Administrador (Treinador)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar Usuário</button>
            </div>
          </form>
        </div>
      ) : (
        /* Users List Table/Cards */
        <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Usuário</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>E-mail</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Nível</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Cadastrado em</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const formattedDate = new Date(u.createdAt).toLocaleDateString('pt-BR');
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background-color 0.2s' }} className="user-table-row">
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-hover)',
                        fontWeight: 600
                      }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.username}</span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${u.role === 'Admin' ? 'badge-admin' : 'badge-user'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {u.role === 'Admin' && <Shield size={12} />}
                        {u.role === 'Admin' ? 'Administrador' : 'Aluno / Usuário'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} />
                        {formattedDate}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
