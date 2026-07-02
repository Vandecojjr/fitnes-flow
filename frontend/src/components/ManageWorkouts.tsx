import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Workout, Exercise, User } from '../types';
import { Plus, Trash2, X, Dumbbell, ArrowUp, ArrowDown } from 'lucide-react';

export const ManageWorkouts: React.FC = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get current logged-in user
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'Admin';

  // Workout Creation Form State
  const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>(''); // empty means template (null)
  const [selectedWorkoutExercises, setSelectedWorkoutExercises] = useState<{
    exerciseId: string;
    sets: number;
    reps: number;
    weight?: number;
    durationSeconds?: number;
    restBetweenSetsSeconds: number;
    restAfterExerciseSeconds: number;
  }[]>([]);

  // Exercise Creation Form State
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [exName, setExName] = useState('');
  const [exDesc, setExDesc] = useState('');
  const [exCategory, setExCategory] = useState('Força');
  const [exDuration, setExDuration] = useState(60);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const workoutsPromise = api.get<Workout[]>('/workouts');
      const exercisesPromise = api.get<Exercise[]>('/exercises');
      
      // Regular users are forbidden from listing users (403), so we load them only for Admins
      const usersPromise = isAdmin ? api.get<User[]>('/users') : Promise.resolve([] as User[]);

      const [workoutsData, exercisesData, usersData] = await Promise.all([
        workoutsPromise,
        exercisesPromise,
        usersPromise,
      ]);
      
      setWorkouts(workoutsData);
      setExercises(exercisesData);
      setUsers(usersData);

      // Force target user to current user if not Admin
      if (!isAdmin) {
        setTargetUserId(currentUser.id);
      }
    } catch (err: any) {
      setError('Erro ao carregar dados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Exercise Operations (Admin only)
  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setError('');
    setSuccess('');

    if (!exName) return;

    try {
      const newEx = await api.post<Exercise>('/exercises', {
        name: exName,
        description: exDesc,
        category: exCategory,
        defaultDurationSeconds: exDuration,
      });

      setExercises(prev => [...prev, newEx]);
      setExName('');
      setExDesc('');
      setExDuration(60);
      setIsCreatingExercise(false);
      setSuccess('Exercício adicionado à biblioteca com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar exercício.');
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Deseja realmente excluir este exercício? Ele será removido de todos os treinos.')) return;
    setError('');
    setSuccess('');

    try {
      await api.delete(`/exercises/${id}`);
      setExercises(prev => prev.filter(e => e.id !== id));
      setSuccess('Exercício excluído da biblioteca.');
      
      const workoutsData = await api.get<Workout[]>('/workouts');
      setWorkouts(workoutsData);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir exercício.');
    }
  };

  // Workout Operations
  const handleAddExerciseToWorkout = (exerciseId: string) => {
    setSelectedWorkoutExercises(prev => [
      ...prev,
      {
        exerciseId,
        sets: 3,
        reps: 10,
        weight: 10,
        durationSeconds: 60,
        restBetweenSetsSeconds: 60,
        restAfterExerciseSeconds: 120,
      },
    ]);
  };

  const handleRemoveExerciseFromWorkout = (index: number) => {
    setSelectedWorkoutExercises(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateWorkoutExerciseField = (index: number, field: string, value: any) => {
    setSelectedWorkoutExercises(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleMoveWorkoutExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedWorkoutExercises.length - 1) return;

    setSelectedWorkoutExercises(prev => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleCreateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!workoutName) {
      setError('O nome do treino é obrigatório.');
      return;
    }

    if (selectedWorkoutExercises.length === 0) {
      setError('Adicione pelo menos um exercício ao treino.');
      return;
    }

    // Admin can choose target, normal users can only assign to themselves
    const assignedUser = isAdmin ? (targetUserId || null) : currentUser.id;

    const payload = {
      name: workoutName,
      description: workoutDesc,
      userId: assignedUser,
      exercises: selectedWorkoutExercises.map((we, index) => ({
        exerciseId: we.exerciseId,
        order: index + 1,
        sets: we.sets,
        reps: we.reps,
        weight: we.weight || null,
        durationSeconds: we.durationSeconds || null,
        restBetweenSetsSeconds: we.restBetweenSetsSeconds,
        restAfterExerciseSeconds: we.restAfterExerciseSeconds,
      })),
    };

    try {
      const newWorkout = await api.post<Workout>('/workouts', payload);
      setWorkouts(prev => [newWorkout, ...prev]);
      
      // Reset Form
      setWorkoutName('');
      setWorkoutDesc('');
      setTargetUserId(isAdmin ? '' : currentUser.id);
      setSelectedWorkoutExercises([]);
      setIsCreatingWorkout(false);
      setSuccess('Treino cadastrado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar treino.');
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!confirm('Deseja realmente excluir este treino?')) return;
    setError('');
    setSuccess('');

    try {
      await api.delete(`/workouts/${id}`);
      setWorkouts(prev => prev.filter(w => w.id !== id));
      setSuccess('Treino excluído com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir treino.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando dados...</p>
      </div>
    );
  }

  // Regular users should only see workouts that belong to them (ignore templates or other users' workouts)
  const displayWorkouts = isAdmin 
    ? workouts 
    : workouts.filter(w => w.userId === currentUser.id);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {isAdmin ? 'Gerenciar Treinos' : 'Montar Meu Treino'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isAdmin 
              ? 'Monte planilhas de treinos e controle o cadastro de exercícios.' 
              : 'Monte e customize suas próprias fichas de treino com os exercícios que quiser.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => setIsCreatingExercise(true)}>
              <Plus size={16} />
              Novo Exercício
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setIsCreatingWorkout(true)}>
            <Plus size={16} />
            Montar Treino
          </button>
        </div>
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

      {/* MODAL: Create/Edit Exercise (Admin only) */}
      {isAdmin && isCreatingExercise && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-premium responsive-modal-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem' }}>Novo Exercício na Biblioteca</h3>
              <button onClick={() => setIsCreatingExercise(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExercise} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label>Nome do Exercício</label>
                <input type="text" value={exName} onChange={(e) => setExName(e.target.value)} placeholder="Ex: Rosca Direta" required />
              </div>
              <div>
                <label>Descrição / Instruções</label>
                <textarea value={exDesc} onChange={(e) => setExDesc(e.target.value)} placeholder="Instruções gerais..." rows={3} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label>Categoria</label>
                  <select value={exCategory} onChange={(e) => setExCategory(e.target.value)}>
                    <option value="Força">Força / Musculação</option>
                    <option value="Cardio">Cardio / Aeróbico</option>
                    <option value="Core">Core / Abdomen</option>
                    <option value="Mobilidade">Mobilidade / Alongamento</option>
                  </select>
                </div>
                <div>
                  <label>Tempo Padrão (segundos)</label>
                  <input type="number" value={exDuration} onChange={(e) => setExDuration(parseInt(e.target.value) || 0)} min="5" />
                </div>
              </div>
              <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingExercise(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar na Biblioteca</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Build Workout Plan */}
      {isCreatingWorkout && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: '20px'
        }}>
          <div className="glass-premium modal-container-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem' }}>Montar Nova Planilha de Treino</h3>
              <button onClick={() => setIsCreatingWorkout(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-desktop-2-inputs">
                <div>
                  <label>Nome do Treino</label>
                  <input type="text" value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} placeholder="Ex: Meu Treino de Braços" required />
                </div>
                {isAdmin && (
                  <div>
                    <label>Atribuir ao Usuário (Opcional)</label>
                    <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
                      <option value="">Nenhum (Salvar como Modelo Global)</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div>
                <label>Descrição do Treino</label>
                <textarea value={workoutDesc} onChange={(e) => setWorkoutDesc(e.target.value)} placeholder="Anotações gerais do treino..." rows={2} />
              </div>

              {/* Selector for exercises */}
              <div style={{ border: '1px dashed rgba(255,255,255,0.1)', padding: '16px', borderRadius: '10px' }}>
                <label style={{ marginBottom: '10px' }}>Adicionar Exercício ao Plano</label>
                {exercises.length === 0 ? (
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Nenhum exercício cadastrado no sistema.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto', padding: '6px' }}>
                    {exercises.map(ex => (
                      <button
                        key={ex.id}
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleAddExerciseToWorkout(ex.id)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        <Plus size={12} /> {ex.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected workout exercises and configurations */}
              <div>
                <label>Exercícios Selecionados ({selectedWorkoutExercises.length})</label>
                {selectedWorkoutExercises.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Clique nos botões acima para incluir os exercícios neste treino.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                    {selectedWorkoutExercises.map((we, index) => {
                      const exInfo = exercises.find(e => e.id === we.exerciseId);
                      return (
                        <div key={index} style={{
                          display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '12px',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '8px', padding: '10px 14px', flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button type="button" onClick={() => handleMoveWorkoutExercise(index, 'up')} disabled={index === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                              <ArrowUp size={16} />
                            </button>
                            <button type="button" onClick={() => handleMoveWorkoutExercise(index, 'down')} disabled={index === selectedWorkoutExercises.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                              <ArrowDown size={16} />
                            </button>
                          </div>

                          <div style={{ flex: 1, minWidth: '120px' }}>
                            <span style={{ fontWeight: 600 }}>{exInfo?.name || 'Exercício'}</span>
                          </div>

                          <div className="exercise-param-grid">
                            <div>
                              <label style={{ fontSize: '0.7rem' }}>Séries</label>
                              <input type="number" value={we.sets} onChange={(e) => handleUpdateWorkoutExerciseField(index, 'sets', parseInt(e.target.value) || 1)} min="1" style={{ padding: '6px' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem' }}>Reps</label>
                              <input type="number" value={we.reps} onChange={(e) => handleUpdateWorkoutExerciseField(index, 'reps', parseInt(e.target.value) || 0)} min="0" style={{ padding: '6px' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem' }}>Carga (kg)</label>
                              <input type="number" value={we.weight !== undefined ? we.weight : ''} onChange={(e) => handleUpdateWorkoutExerciseField(index, 'weight', parseFloat(e.target.value) || undefined)} placeholder="Meta kg" style={{ padding: '6px' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem' }}>Tempo (seg)</label>
                              <input type="number" value={we.durationSeconds !== undefined ? we.durationSeconds : ''} onChange={(e) => handleUpdateWorkoutExerciseField(index, 'durationSeconds', parseInt(e.target.value) || undefined)} placeholder="Ex: 60" style={{ padding: '6px' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem' }}>Rest Set (s)</label>
                              <input type="number" value={we.restBetweenSetsSeconds} onChange={(e) => handleUpdateWorkoutExerciseField(index, 'restBetweenSetsSeconds', parseInt(e.target.value) || 0)} min="0" style={{ padding: '6px' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem' }}>Rest Ex (s)</label>
                              <input type="number" value={we.restAfterExerciseSeconds} onChange={(e) => handleUpdateWorkoutExerciseField(index, 'restAfterExerciseSeconds', parseInt(e.target.value) || 0)} min="0" style={{ padding: '6px' }} />
                            </div>
                          </div>

                          <button type="button" onClick={() => handleRemoveExerciseFromWorkout(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingWorkout(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Planilha de Treino</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Lists Grid */}
      <div className="responsive-grid-2">
        
        {/* Workouts Management List */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>
            {isAdmin ? 'Todos os Treinos Cadastrados' : 'Minhas Fichas Criadas'}
          </h3>
          {displayWorkouts.length === 0 ? (
            <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
              <Dumbbell size={36} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Nenhum treino montado ainda.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {displayWorkouts.map(workout => {
                const assignedUser = users.find(u => u.id === workout.userId);
                return (
                  <div key={workout.id} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '1.1rem', color: '#ffffff' }}>{workout.name}</h4>
                          {isAdmin && (
                            <span className={`badge ${workout.userId ? 'badge-user' : 'badge-admin'}`}>
                              {workout.userId ? `Usuário: ${assignedUser?.username || 'Desconhecido'}` : 'Modelo Global (Template)'}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{workout.description || 'Sem descrição.'}</p>
                      </div>
                      <button className="btn btn-danger" onClick={() => handleDeleteWorkout(workout.id)} style={{ padding: '6px 10px', fontSize: '0.78rem' }}>
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Exercícios:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {workout.exercises.map((we, index) => (
                          <div key={index} style={{
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem'
                          }}>
                            {index + 1}. {we.exerciseName} ({we.sets}x{we.reps})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Exercise Library Column */}
        <div className="glass" style={{ padding: '24px', alignSelf: 'start' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
            Biblioteca de Exercícios ({exercises.length})
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Selecione exercícios desta lista ao montar suas planilhas de treinos.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {exercises.map(ex => (
              <div key={ex.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{ex.name}</span>
                  <span className="badge badge-user" style={{ fontSize: '0.65rem', marginLeft: '8px', padding: '2px 6px' }}>{ex.category}</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{ex.description || 'Sem descrição.'}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteExercise(ex.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
