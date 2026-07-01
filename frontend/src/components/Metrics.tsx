import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { WorkoutSession } from '../types';
import { Calendar, Clock, Trophy, BarChart2, ChevronDown, ChevronUp, Activity } from 'lucide-react';

export const Metrics: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track expanded session details
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get<WorkoutSession[]>('/sessions');
      // Only keep completed sessions
      setSessions(data.filter(s => s.completedAt));
    } catch (err: any) {
      setError('Erro ao carregar histórico de treinos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandSession = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  // Calculations
  const totalWorkouts = sessions.length;
  
  const totalDurationMinutes = sessions.reduce((acc, s) => {
    if (!s.completedAt) return acc;
    const duration = Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
    return acc + duration;
  }, 0);

  const averageDuration = totalWorkouts > 0 ? Math.round(totalDurationMinutes / totalWorkouts) : 0;

  // Calculate Personal Records (PRs) - Max weight used per exercise
  const personalRecords: { [exerciseName: string]: { weight: number; date: string; workoutName: string } } = {};
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.completedAt!).toLocaleDateString('pt-BR');
    session.exercises.forEach(ex => {
      if (ex.weightUsed !== undefined && ex.weightUsed !== null && ex.weightUsed > 0) {
        const existing = personalRecords[ex.exerciseName];
        if (!existing || ex.weightUsed > existing.weight) {
          personalRecords[ex.exerciseName] = {
            weight: ex.weightUsed,
            date: sessionDate,
            workoutName: session.workoutName
          };
        }
      }
    });
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando suas estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Métricas & Histórico</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Visualize seu progresso de cargas, tempos e frequência.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Stats Quick Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        <div className="glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', padding: '10px', borderRadius: '10px' }}>
            <Activity size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total de Treinos</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalWorkouts} sessões</h4>
          </div>
        </div>

        <div className="glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', padding: '10px', borderRadius: '10px' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tempo Total Acumulado</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalDurationMinutes} min</h4>
          </div>
        </div>

        <div className="glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '10px', borderRadius: '10px' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Duração Média / Treino</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{averageDuration} min</h4>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '30px'
      }} className="grid-layout-md">
        
        {/* Personal Records Column */}
        <div className="glass" style={{ padding: '24px', alignSelf: 'start' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="#fbbf24" />
            Recordes de Carga (PRs)
          </h3>
          
          {Object.keys(personalRecords).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
              Nenhum recorde registrado ainda. Insira cargas nos exercícios durante seu treino.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(personalRecords).map(([exName, record]) => (
                <div key={exName} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  padding: '12px 16px',
                  borderRadius: '10px'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{exName}</span>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Alcançado em: {record.date} ({record.workoutName})
                    </p>
                  </div>
                  <span style={{
                    background: 'rgba(251, 191, 36, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.95rem'
                  }}>
                    {record.weight} kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Log Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--primary-hover)" />
            Histórico Completo de Sessões
          </h3>

          {sessions.length === 0 ? (
            <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
              <Calendar size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Nenhum treino concluído no histórico.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map(session => {
                const isExpanded = expandedSessionId === session.id;
                const date = new Date(session.completedAt!).toLocaleDateString('pt-BR');
                const time = new Date(session.completedAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const duration = Math.round((new Date(session.completedAt!).getTime() - new Date(session.startedAt).getTime()) / 60000);
                
                return (
                  <div key={session.id} className="glass" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      onClick={() => toggleExpandSession(session.id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div>
                        <h4 style={{ fontSize: '1.05rem', color: '#ffffff' }}>{session.workoutName}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                          <span>📅 {date} às {time}</span>
                          <span>⏱️ {duration} minutos</span>
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        paddingTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        {session.notes && (
                          <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            borderLeft: '3px solid var(--secondary)',
                            fontSize: '0.85rem',
                          }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Anotações: </span>
                            <span style={{ color: 'var(--text-primary)' }}>"{session.notes}"</span>
                          </div>
                        )}

                        <div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                            Exercícios Executados
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                            {session.exercises.map((ex, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.01)',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.02)',
                                fontSize: '0.85rem'
                              }}>
                                <span>{ex.exerciseName}</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  {ex.setsCompleted}x{ex.repsCompleted} reps 
                                  {ex.weightUsed ? ` @ ${ex.weightUsed} kg` : ''} 
                                  {ex.durationSeconds ? ` (${Math.round(ex.durationSeconds / 60)} min)` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
