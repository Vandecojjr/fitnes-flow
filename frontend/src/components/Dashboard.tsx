import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Workout, WorkoutSession } from '../types';
import { 
  Dumbbell, 
  Clock, 
  Play, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Minus, 
  X 
} from 'lucide-react';

interface DashboardProps {
  onStartWorkout: (workoutId: string) => void;
  onNavigate: (view: string) => void;
}

interface AdjustedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  durationSeconds?: number;
  restBetweenSetsSeconds: number;
  restAfterExerciseSeconds: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartWorkout, onNavigate }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Weight Adjustment Modal State
  const [adjustingWorkout, setAdjustingWorkout] = useState<Workout | null>(null);
  const [adjustedExercises, setAdjustedExercises] = useState<AdjustedExercise[]>([]);

  // Get current user details
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [workoutsData, sessionsData] = await Promise.all([
          api.get<Workout[]>('/workouts'),
          api.get<WorkoutSession[]>('/sessions')
        ]);
        setWorkouts(workoutsData);
        setSessions(sessionsData);
      } catch (err: any) {
        setError('Não foi possível carregar as informações do dashboard.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculations
  const completedSessions = sessions.filter(s => s.completedAt).length;
  
  // Calculate total workout time in minutes
  const totalMinutes = sessions.reduce((acc, session) => {
    if (session.completedAt) {
      const start = new Date(session.startedAt).getTime();
      const end = new Date(session.completedAt).getTime();
      return acc + Math.round((end - start) / 60000);
    }
    return acc;
  }, 0);

  // Weight adjustment handlers
  const handleOpenWeightAdjust = (workout: Workout) => {
    setAdjustingWorkout(workout);
    setAdjustedExercises(workout.exercises.map(e => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight || 0,
      durationSeconds: e.durationSeconds,
      restBetweenSetsSeconds: e.restBetweenSetsSeconds,
      restAfterExerciseSeconds: e.restAfterExerciseSeconds
    })));
  };

  const handleAdjustWeight = (index: number, amount: number) => {
    setAdjustedExercises(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        weight: Math.max(0, Math.round((copy[index].weight + amount) * 10) / 10)
      };
      return copy;
    });
  };

  const handleSetDirectWeight = (index: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setAdjustedExercises(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], weight: Math.max(0, val) };
      return copy;
    });
  };

  const handleSaveLoads = async () => {
    if (!adjustingWorkout) return;
    setError('');

    try {
      const isTemplate = !adjustingWorkout.userId;
      const isRegularUser = currentUser.role !== 'Admin';

      if (isTemplate && isRegularUser) {
        // If a normal student modifies a global template, clone it as their personal sheet
        const payload = {
          name: `Meu ${adjustingWorkout.name}`,
          description: adjustingWorkout.description || 'Cópia de modelo com cargas adaptadas.',
          userId: currentUser.id,
          exercises: adjustedExercises.map((ae, index) => ({
            exerciseId: ae.exerciseId,
            order: index + 1,
            sets: ae.sets,
            reps: ae.reps,
            weight: ae.weight,
            durationSeconds: ae.durationSeconds || null,
            restBetweenSetsSeconds: ae.restBetweenSetsSeconds,
            restAfterExerciseSeconds: ae.restAfterExerciseSeconds,
          }))
        };

        const clonedWorkout = await api.post<Workout>('/workouts', payload);
        setWorkouts(prev => [clonedWorkout, ...prev]);
        alert(`Este treino era um modelo geral. Criamos uma planilha personalizada intitulada "${clonedWorkout.name}" em sua conta com as novas cargas!`);
      } else {
        // Direct save on editable workouts (own workouts or admin updates)
        const payload = {
          name: adjustingWorkout.name,
          description: adjustingWorkout.description,
          userId: adjustingWorkout.userId,
          exercises: adjustedExercises.map((ae, index) => ({
            exerciseId: ae.exerciseId,
            order: index + 1,
            sets: ae.sets,
            reps: ae.reps,
            weight: ae.weight,
            durationSeconds: ae.durationSeconds || null,
            restBetweenSetsSeconds: ae.restBetweenSetsSeconds,
            restAfterExerciseSeconds: ae.restAfterExerciseSeconds,
          }))
        };

        const updated = await api.put<Workout>(`/workouts/${adjustingWorkout.id}`, payload);
        setWorkouts(prev => prev.map(w => w.id === updated.id ? updated : w));
      }

      setAdjustingWorkout(null);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar as novas cargas.');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando dados do painel...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Welcome Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Resumo Geral</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Acompanhe sua consistência e inicie seus treinos diários.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {/* Stat Card 1 */}
        <div className="glass" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', padding: '12px', borderRadius: '12px' }}>
            <Dumbbell size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Treinos Feitos</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '2px' }}>{completedSessions}</h3>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="glass" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', padding: '12px', borderRadius: '12px' }}>
            <Clock size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Minutos Ativos</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '2px' }}>{totalMinutes} min</h3>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="responsive-grid-2">
        
        {/* Workouts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Meus Treinos Disponíveis</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{workouts.length} treinos no total</p>
          </div>

          {workouts.length === 0 ? (
            <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
              <Dumbbell size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Nenhum treino disponível ainda.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Solicite ao administrador para cadastrar seus treinos ou crie novos.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {workouts.map(workout => (
                <div key={workout.id} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.15rem', color: '#ffffff' }}>{workout.name}</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{workout.description || 'Sem descrição.'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }} className="flex-mobile-column">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleOpenWeightAdjust(workout)}
                        style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <TrendingUp size={16} color="var(--secondary)" />
                        Aumentar Carga
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => onStartWorkout(workout.id)}
                        style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                      >
                        <Play size={16} fill="#ffffff" />
                        Iniciar Treino
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Exercícios ({workout.exercises.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {workout.exercises.map((ex, index) => (
                        <div key={index} style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <span style={{ color: 'var(--primary-hover)', fontWeight: 600 }}>{ex.sets}x</span>
                          <span>{ex.exerciseName}</span>
                          {ex.reps > 0 && <span style={{ color: 'var(--text-muted)' }}>({ex.reps} reps)</span>}
                          {ex.weight ? <span style={{ color: 'var(--secondary)' }}>{ex.weight}kg</span> : null}
                          {ex.durationSeconds ? <span style={{ color: 'var(--accent)' }}>{ex.durationSeconds}s</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals & History Sidebar / Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Recent Workout History Card */}
          <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} color="var(--success)" />
                Histórico Recente
              </h3>
              <button 
                onClick={() => onNavigate('metrics')}
                style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Métricas
              </button>
            </div>

            {sessions.filter(s => s.completedAt).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '16px 0' }}>
                Nenhum treino concluído ainda.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sessions.filter(s => s.completedAt).slice(0, 3).map(session => {
                  const date = new Date(session.completedAt!).toLocaleDateString('pt-BR');
                  const duration = Math.round((new Date(session.completedAt!).getTime() - new Date(session.startedAt).getTime()) / 60000);
                  return (
                    <div key={session.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.03)'
                    }}>
                      <div>
                        <p style={{ fontSize: '0.88rem', fontWeight: 500 }}>{session.workoutName}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Calendar size={12} /> {date}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {duration} min
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL: Adjust Target Weights */}
      {adjustingWorkout && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-premium responsive-modal-body">
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ajustar Sobrecarga</span>
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Cargas do Treino: {adjustingWorkout.name}</h3>
              </div>
              <button onClick={() => setAdjustingWorkout(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Ajuste as metas de peso para cada exercício antes de realizar seu treino. 
              {currentUser.role !== 'Admin' && !adjustingWorkout.userId && (
                <span style={{ color: 'var(--secondary)', display: 'block', marginTop: '4px' }}>
                  * Como este é um modelo geral, salvaremos uma cópia personalizada dele em sua conta ao confirmar.
                </span>
              )}
            </p>

            {/* Exercises weight listing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {adjustedExercises.map((ae, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {/* Left Side: Ex Name & Sets */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>{ae.exerciseName}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Fórmula: {ae.sets} séries x {ae.reps} repetições
                    </p>
                  </div>

                  {/* Right Side: Weight controls & Quick actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => handleAdjustWeight(index, -1)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
                      >
                        <Minus size={14} />
                      </button>
                      
                      <div style={{ position: 'relative', width: '80px' }}>
                        <input
                          type="number"
                          value={ae.weight}
                          onChange={(e) => handleSetDirectWeight(index, e.target.value)}
                          style={{
                            padding: '6px 24px 6px 10px',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: 'var(--secondary)',
                            fontSize: '1rem',
                            width: '100%'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          kg
                        </span>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => handleAdjustWeight(index, 1)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Quick increment buttons */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button" 
                        onClick={() => handleAdjustWeight(index, 1)}
                        style={{ padding: '2px 6px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      >
                        +1kg
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleAdjustWeight(index, 2)}
                        style={{ padding: '2px 6px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      >
                        +2kg
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleAdjustWeight(index, 5)}
                        style={{ padding: '2px 6px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      >
                        +5kg
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdjustingWorkout(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveLoads} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} />
                Confirmar Novas Cargas
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
