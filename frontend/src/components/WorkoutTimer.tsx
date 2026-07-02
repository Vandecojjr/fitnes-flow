import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { Workout, WorkoutSession } from '../types';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Check, Clock, Save, Trash2, Award, Zap } from 'lucide-react';

interface WorkoutTimerProps {
  workoutId: string;
  onSessionComplete: () => void;
  onCancel: () => void;
}

interface LoggingExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  durationSeconds: number;
  restBetweenSetsSeconds: number;
  restAfterExerciseSeconds: number;
  
  // Tracked logs
  setsCompleted: number;
  repsCompleted: number;
  weightUsed?: number;
  actualDuration: number;
  completed: boolean;
}

export const WorkoutTimer: React.FC<WorkoutTimerProps> = ({ workoutId, onSessionComplete, onCancel }) => {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Workout State
  const [exercises, setExercises] = useState<LoggingExercise[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSet, setActiveSet] = useState(0); // 0-indexed (e.g. 0 = Set 1)
  
  // Timers
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [exerciseSeconds, setExerciseSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restMode, setRestMode] = useState<'set' | 'exercise'>('set');
  const [notes, setNotes] = useState('');

  // Refs for tracking timer intervals
  const totalTimerRef = useRef<number | null>(null);
  const exerciseTimerRef = useRef<number | null>(null);

  // Web Audio API beep sound
  const playBeep = (freq = 880, duration = 0.3) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked or unsupported browser", e);
    }
  };

  // Start/Get Active Session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setLoading(true);
        // 1. Fetch workout template details
        const w = await api.get<Workout>(`/workouts/${workoutId}`);
        setWorkout(w);

        // 2. Check for active session, start one if none exists
        let activeSession: WorkoutSession;
        try {
          activeSession = await api.get<WorkoutSession>('/sessions/active');
          if (activeSession.workoutId !== workoutId) {
            // Cancel old and start new
            await api.delete(`/sessions/${activeSession.id}`);
            activeSession = await api.post<WorkoutSession>('/sessions/start', { workoutId });
          }
        } catch {
          activeSession = await api.post<WorkoutSession>('/sessions/start', { workoutId });
        }

        setSession(activeSession);
        
        // 3. Map template exercises to logging state
        const loggingExs: LoggingExercise[] = w.exercises.map(we => ({
          exerciseId: we.exerciseId,
          exerciseName: we.exerciseName,
          sets: we.sets,
          reps: we.reps,
          weight: we.weight,
          durationSeconds: we.durationSeconds || 60,
          restBetweenSetsSeconds: we.restBetweenSetsSeconds || 60,
          restAfterExerciseSeconds: we.restAfterExerciseSeconds || 120,
          setsCompleted: 0, // starts at 0 completed sets
          repsCompleted: we.reps,
          weightUsed: we.weight,
          actualDuration: 0,
          completed: false
        }));

        setExercises(loggingExs);
        
        // Initial timer value based on active exercise duration
        if (loggingExs.length > 0) {
          setExerciseSeconds(loggingExs[0].durationSeconds);
        }

        // Calculate elapsed time if session was already active
        const startTime = new Date(activeSession.startedAt).getTime();
        const now = Date.now();
        setTotalSeconds(Math.max(0, Math.round((now - startTime) / 1000)));

        // Start total session stopwatch
        startTotalStopwatch();

      } catch (err: any) {
        setError(err.message || 'Erro ao inicializar o treino.');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    return () => {
      stopTotalStopwatch();
      stopExerciseTimer();
    };
  }, [workoutId]);

  // Master Stopwatches
  const startTotalStopwatch = () => {
    if (totalTimerRef.current) return;
    totalTimerRef.current = window.setInterval(() => {
      setTotalSeconds(prev => prev + 1);
      // Increment active exercise actual duration
      setExercises(prev => {
        if (prev.length === 0 || isResting) return prev;
        const copy = [...prev];
        copy[activeIndex] = {
          ...copy[activeIndex],
          actualDuration: copy[activeIndex].actualDuration + 1
        };
        return copy;
      });
    }, 1000);
  };

  const stopTotalStopwatch = () => {
    if (totalTimerRef.current) {
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }
  };

  // Exercise Countdown Timer
  const startExerciseTimer = () => {
    if (exerciseTimerRef.current) return;
    setTimerRunning(true);
    exerciseTimerRef.current = window.setInterval(() => {
      setExerciseSeconds(prev => {
        if (prev <= 1) {
          stopExerciseTimer();
          playBeep();
          
          if (isResting) {
            handleRestComplete();
            return 0;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopExerciseTimer = () => {
    if (exerciseTimerRef.current) {
      clearInterval(exerciseTimerRef.current);
      exerciseTimerRef.current = null;
    }
    setTimerRunning(false);
  };

  const resetExerciseTimer = () => {
    stopExerciseTimer();
    const duration = isResting 
      ? (restMode === 'set' ? exercises[activeIndex].restBetweenSetsSeconds : exercises[activeIndex].restAfterExerciseSeconds)
      : (exercises[activeIndex]?.durationSeconds || 60);
    setExerciseSeconds(duration);
  };

  const handleToggleTimer = () => {
    if (timerRunning) {
      stopExerciseTimer();
    } else {
      startExerciseTimer();
    }
  };

  // Workout Set Execution logic
  const handleCompleteSet = () => {
    const activeEx = exercises[activeIndex];
    
    // Increment completed sets count
    const updatedSetsCompleted = Math.min(activeEx.sets, activeEx.setsCompleted + 1);
    
    setExercises(prev => {
      const copy = [...prev];
      copy[activeIndex] = {
        ...copy[activeIndex],
        setsCompleted: updatedSetsCompleted
      };
      return copy;
    });

    stopExerciseTimer();

    // Is it the last set of the current exercise?
    if (activeSet >= activeEx.sets - 1) {
      // Yes, last set!
      
      // Is it the last exercise of the entire workout?
      if (activeIndex >= exercises.length - 1) {
        // Last set of last exercise -> Workout finished, no more rests!
        setExercises(prev => {
          const copy = [...prev];
          copy[activeIndex] = { ...copy[activeIndex], completed: true };
          return copy;
        });
        setIsResting(false);
        setActiveSet(activeEx.sets - 1);
        playBeep(1200, 0.4);
        setTimeout(() => playBeep(1500, 0.4), 150);
      } else {
        // Last set of current exercise -> Rest between exercises!
        setRestMode('exercise');
        setIsResting(true);
        setExerciseSeconds(activeEx.restAfterExerciseSeconds);
        startExerciseTimer(); // auto-run rest timer
      }
    } else {
      // Not the last set -> Rest between sets!
      setRestMode('set');
      setIsResting(true);
      setExerciseSeconds(activeEx.restBetweenSetsSeconds);
      startExerciseTimer(); // auto-run rest timer
    }
  };

  const handleRestComplete = () => {
    stopExerciseTimer();
    setIsResting(false);
    
    if (restMode === 'set') {
      // Go to next set
      setActiveSet(prev => prev + 1);
      setExerciseSeconds(exercises[activeIndex].durationSeconds);
    } else {
      // Go to next exercise
      setExercises(prev => {
        const copy = [...prev];
        copy[activeIndex] = { ...copy[activeIndex], completed: true };
        return copy;
      });
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      setActiveSet(0);
      setExerciseSeconds(exercises[nextIndex].durationSeconds);
    }
  };

  const handleSkipRest = () => {
    handleRestComplete();
  };

  // Navigation overrides
  const handleNextExercise = () => {
    stopExerciseTimer();
    setIsResting(false);

    setExercises(prev => {
      const copy = [...prev];
      copy[activeIndex] = { ...copy[activeIndex], completed: true, setsCompleted: copy[activeIndex].sets };
      return copy;
    });

    if (activeIndex < exercises.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      setActiveSet(0);
      setExerciseSeconds(exercises[nextIndex].durationSeconds);
    }
  };

  const handlePrevExercise = () => {
    if (activeIndex > 0) {
      stopExerciseTimer();
      setIsResting(false);
      const nextIndex = activeIndex - 1;
      setActiveIndex(nextIndex);
      setActiveSet(0);
      setExerciseSeconds(exercises[nextIndex].durationSeconds);
    }
  };

  const handleFieldChange = (field: keyof LoggingExercise, val: any) => {
    setExercises(prev => {
      const copy = [...prev];
      copy[activeIndex] = {
        ...copy[activeIndex],
        [field]: val
      };
      return copy;
    });
  };

  const handleFinishWorkout = async () => {
    if (!session) return;
    
    // Complete all exercises
    const finalExercises = exercises.map(ex => ({
      ...ex,
      completed: true,
      setsCompleted: ex.setsCompleted || ex.sets // fallback if they skipped clicking
    }));

    try {
      setLoading(true);
      await api.post(`/sessions/${session.id}/complete`, {
        notes,
        exercises: finalExercises.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          setsCompleted: ex.setsCompleted,
          repsCompleted: ex.repsCompleted,
          weightUsed: ex.weightUsed,
          durationSeconds: ex.actualDuration || ex.durationSeconds
        }))
      });
      playBeep(1200, 0.5);
      setTimeout(() => playBeep(1500, 0.5), 200);
      onSessionComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o treino.');
      setLoading(false);
    }
  };

  const handleCancelWorkout = async () => {
    if (!session) return;
    if (!confirm('Deseja realmente cancelar este treino? Os dados não serão salvos.')) return;

    try {
      setLoading(true);
      await api.delete(`/sessions/${session.id}`);
      onCancel();
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar o treino.');
      setLoading(false);
    }
  };

  // Formatting helper MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (loading && !session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando seu treino e cronômetro...</p>
      </div>
    );
  }

  const activeEx = exercises[activeIndex];
  const workoutFinished = exercises.every(e => e.completed) || (activeIndex === exercises.length - 1 && activeEx?.setsCompleted >= activeEx?.sets);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Active Workout Top Status */}
      <div className="glass" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary-hover)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Treino em Execução
          </span>
          <h2 style={{ fontSize: '1.4rem' }}>{workout?.name}</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <Clock size={16} />
            <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 600 }}>
              {formatTime(totalSeconds)}
            </span>
          </div>
          <button 
            className="btn btn-danger" 
            onClick={handleCancelWorkout}
            style={{ padding: '8px 12px', fontSize: '0.82rem' }}
          >
            <Trash2 size={14} />
            Cancelar
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Main Container Grid */}
      <div className="responsive-grid-timer">
        
        {/* Core Timer Interface Card */}
        <div className="glass-premium" style={{
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Pulsing indicator */}
          {timerRunning && (
            <div style={{
              position: 'absolute',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: isResting ? 'rgba(6, 182, 212, 0.05)' : 'rgba(147, 51, 234, 0.04)',
              filter: 'blur(50px)',
              zIndex: 0,
              animation: 'pulse-glow 1.5s infinite ease-in-out'
            }} />
          )}

          <div style={{ zIndex: 1 }}>
            {isResting ? (
              <span className="badge animate-pulse-glow" style={{
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#67e8f9',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                marginBottom: '10px'
              }}>
                ⏱️ DESCANSO ATIVO: {restMode === 'set' ? 'ENTRE SÉRIES' : 'ENTRE EXERCÍCIOS'}
              </span>
            ) : (
              <span className="badge" style={{
                background: 'rgba(147, 51, 234, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                marginBottom: '10px'
              }}>
                💪 EXERCÍCIO {activeIndex + 1} de {exercises.length}
              </span>
            )}

            <h3 style={{ fontSize: '1.8rem', marginTop: '6px' }}>
              {isResting 
                ? (restMode === 'set' ? 'Intervalo da Série' : 'Próximo Exercício') 
                : activeEx?.exerciseName
              }
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '400px' }}>
              {isResting 
                ? (restMode === 'set' 
                    ? `Respire por ${activeEx.restBetweenSetsSeconds}s antes da Série ${activeSet + 2}` 
                    : `Prepare-se para: ${exercises[activeIndex + 1]?.exerciseName}`
                  )
                : (activeEx?.exerciseId ? workout?.exercises[activeIndex]?.exerciseDescription : '')
              }
            </p>
          </div>

          {/* Timer Clock Circle */}
          <div style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: `6px solid ${isResting ? 'var(--secondary)' : 'var(--primary)'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 24px ${isResting ? 'rgba(6, 182, 212, 0.2)' : 'rgba(147, 51, 234, 0.15)'}`,
            zIndex: 1
          }}>
            {isResting ? (
              <span style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'monospace', color: '#ffffff' }}>
                {formatTime(exerciseSeconds)}
              </span>
            ) : (
              <>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SÉRIE ATUAL
                </span>
                <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                  {activeEx?.setsCompleted + 1} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>/ {activeEx?.sets}</span>
                </span>
              </>
            )}
          </div>

          {/* Interactive controls */}
          <div style={{ display: 'flex', gap: '14px', zIndex: 1, width: '100%', justifyContent: 'center' }} className="flex-mobile-column">
            {isResting ? (
              <>
                <button className="btn btn-secondary" onClick={resetExerciseTimer} style={{ padding: '12px' }}>
                  <RotateCcw size={18} />
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleToggleTimer}
                  style={{
                    padding: '12px 24px',
                    background: timerRunning ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                    border: timerRunning ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  }}
                >
                  {timerRunning ? <Pause size={18} /> : <Play size={18} fill="#ffffff" />}
                  <span style={{ marginLeft: '6px' }}>{timerRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>
                <button className="btn btn-accent" onClick={handleSkipRest}>
                  Pular Descanso
                </button>
              </>
            ) : (
              workoutFinished ? (
                <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <Zap size={20} /> Treino Concluído! Finalize abaixo.
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleCompleteSet}
                  style={{ padding: '14px 40px', fontSize: '1rem', background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)', width: '100%', justifyContent: 'center' }}
                >
                  <Check size={18} />
                  Concluir Série {activeEx?.setsCompleted + 1}
                </button>
              )
            )}
          </div>
        </div>

        {/* Reps and weight configuration card */}
        {!isResting && activeEx && !workoutFinished && (
          <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--secondary)" />
              Configurações da Série
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Repetições Alvo</label>
                <input
                  type="number"
                  value={activeEx.repsCompleted}
                  onChange={(e) => handleFieldChange('repsCompleted', parseInt(e.target.value) || 0)}
                  min="0"
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Meta da ficha: {activeEx.reps} reps</span>
              </div>
              
              <div>
                <label>Peso Utilizado (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={activeEx.weightUsed !== undefined ? activeEx.weightUsed : ''}
                  onChange={(e) => handleFieldChange('weightUsed', parseFloat(e.target.value) || undefined)}
                  placeholder="Ex: 25"
                />
                {activeEx.weight !== undefined && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sugerido: {activeEx.weight} kg</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Descanso entre Séries:</span>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>⏱️ {activeEx.restBetweenSetsSeconds}s</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Descanso entre Exercícios:</span>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>⏱️ {activeEx.restAfterExerciseSeconds}s</p>
              </div>
            </div>

            {/* Navigation options */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={handlePrevExercise}
                disabled={activeIndex === 0}
                style={{ padding: '10px 14px' }}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              
              <button
                className="btn btn-secondary"
                onClick={handleNextExercise}
                disabled={activeIndex === exercises.length - 1}
                style={{ padding: '10px 14px' }}
              >
                Pular Exercício
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Routine roadmap and Finish Workout Form */}
      <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Roteiro do Treino</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {exercises.map((ex, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (idx !== activeIndex) {
                    stopExerciseTimer();
                    setIsResting(false);
                    setActiveIndex(idx);
                    setActiveSet(0);
                    setExerciseSeconds(exercises[idx].durationSeconds);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: isCurrent ? 'rgba(147, 51, 234, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                  border: isCurrent ? '1px solid rgba(147, 51, 234, 0.3)' : '1px solid rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: ex.completed ? 'var(--success)' : (isCurrent ? 'var(--primary)' : 'rgba(255,255,255,0.05)'),
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}>
                    {ex.completed ? <Check size={14} /> : idx + 1}
                  </div>
                  <div>
                    <span style={{ fontWeight: isCurrent ? 600 : 400, color: isCurrent ? '#ffffff' : 'var(--text-primary)' }}>
                      {ex.exerciseName}
                    </span>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Séries: {ex.setsCompleted} / {ex.sets} • {ex.repsCompleted} reps {ex.weightUsed ? `• ${ex.weightUsed}kg` : ''}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Set Rest: {ex.restBetweenSetsSeconds}s</span>
                  <span>Ex Rest: {ex.restAfterExerciseSeconds}s</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Finishing Session details */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label htmlFor="notes">Anotações do Treino (Opcional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como se sentiu hoje? Ex: Aumentei carga no supino, senti leve fadiga no ombro."
              rows={3}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleFinishWorkout}
            disabled={loading}
            style={{ 
              padding: '14px', 
              width: '100%', 
              fontSize: '1.05rem', 
              background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', 
              boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Finalizar e Salvar Treino'}
          </button>
        </div>
      </div>

    </div>
  );
};
