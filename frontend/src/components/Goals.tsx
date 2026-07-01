import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Goal } from '../types';
import { Plus, Trash2, Calendar, Target, PlusCircle, MinusCircle } from 'lucide-react';

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Goal Form State
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(10);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('sessions'); // kg, sessions, minutes
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await api.get<Goal[]>('/goals');
      setGoals(data);
    } catch (err: any) {
      setError('Erro ao carregar metas.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !targetDate) {
      setError('Título e Data Limite são obrigatórios.');
      return;
    }

    try {
      const newGoal = await api.post<Goal>('/goals', {
        title,
        description,
        targetValue,
        currentValue,
        unit,
        targetDate: new Date(targetDate).toISOString(),
      });

      setGoals(prev => [...prev, newGoal]);
      setTitle('');
      setDescription('');
      setTargetValue(10);
      setCurrentValue(0);
      setUnit('sessions');
      setTargetDate('');
      setIsCreating(false);
      setSuccess('Meta criada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar meta.');
    }
  };

  const handleAdjustProgress = async (id: string, increment: number) => {
    setError('');
    
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const newCurrent = Math.max(0, goal.currentValue + increment);
    const isCompleted = newCurrent >= goal.targetValue;

    try {
      const updated = await api.put<Goal>(`/goals/${id}`, {
        currentValue: newCurrent,
        isCompleted,
      });

      setGoals(prev => prev.map(g => g.id === id ? updated : g));
      if (isCompleted && !goal.isCompleted) {
        setSuccess(`Parabéns! Você alcançou sua meta: "${goal.title}"! 🎉`);
      }
    } catch (err: any) {
      setError('Erro ao atualizar progresso da meta.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Deseja realmente remover esta meta?')) return;
    setError('');

    try {
      await api.delete(`/goals/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
      setSuccess('Meta removida.');
    } catch (err: any) {
      setError('Erro ao excluir meta.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando suas metas...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Minhas Metas</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Defina objetivos e acompanhe sua evolução.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(!isCreating)}>
          <Plus size={16} />
          {isCreating ? 'Ver Lista' : 'Nova Meta'}
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
        /* Create Goal Form */
        <div className="glass" style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="var(--primary-hover)" />
            Adicionar Novo Objetivo
          </h3>

          <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="goal-title">Título da Meta</label>
              <input
                id="goal-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Treinar 15 vezes no mês / Pesar 80kg"
                required
              />
            </div>

            <div>
              <label htmlFor="goal-desc">Descrição / Detalhes (Opcional)</label>
              <textarea
                id="goal-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Focar em consistência / Controlar alimentação"
                rows={2}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Unidade de Medida</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="sessions">Treinos Realizados (Sessões)</option>
                  <option value="kg">Peso Corporal (kg)</option>
                  <option value="minutes">Tempo de Treino (Minutos)</option>
                  <option value="outros">Outros / Geral</option>
                </select>
              </div>

              <div>
                <label htmlFor="goal-date">Data Limite (Meta)</label>
                <input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="goal-target">Valor Alvo (Meta)</label>
                <input
                  id="goal-target"
                  type="number"
                  step="0.1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  min="0.1"
                  required
                />
              </div>

              <div>
                <label htmlFor="goal-current">Valor Inicial (Atual)</label>
                <input
                  id="goal-current"
                  type="number"
                  step="0.1"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(parseFloat(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar Meta</button>
            </div>
          </form>
        </div>
      ) : (
        /* Goals List Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {goals.length === 0 ? (
            <div className="glass" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
              <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Nenhuma meta configurada ainda.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Clique em "Nova Meta" para estipular seus primeiros objetivos físicos ou de consistência.
              </p>
            </div>
          ) : (
            goals.map(goal => {
              const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
              const date = new Date(goal.targetDate).toLocaleDateString('pt-BR');
              
              return (
                <div key={goal.id} className="glass" style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  border: goal.isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--card-border)'
                }}>
                  {/* Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.15rem', color: '#ffffff', textDecoration: goal.isCompleted ? 'line-through' : 'none' }}>
                        {goal.title}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{goal.description}</p>
                    </div>
                    
                    {goal.isCompleted ? (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        Concluído
                      </span>
                    ) : (
                      <span className="badge badge-user">
                        Em progresso
                      </span>
                    )}
                  </div>

                  {/* Progress Meter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                      <span style={{ fontWeight: 600 }}>{goal.currentValue} / {goal.targetValue} {goal.unit} ({percent}%)</span>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        background: goal.isCompleted 
                          ? 'linear-gradient(to right, #10b981, #34d399)'
                          : 'linear-gradient(to right, var(--primary), var(--secondary))',
                        height: '100%',
                        width: `${percent}%`,
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>

                  {/* Controls to adjust progress */}
                  {!goal.isCompleted && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Ajustar Tally:</span>
                      <button 
                        onClick={() => handleAdjustProgress(goal.id, -1)} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <MinusCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleAdjustProgress(goal.id, 1)} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                  )}

                  {/* Date and Delete actions */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: '12px',
                    marginTop: '4px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      Até: {date}
                    </span>
                    
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};
