import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { WorkoutSession } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Flame, 
  TrendingUp, 
  AlertTriangle,
  Award,
  CheckCircle,
  X,
  Clock
} from 'lucide-react';

interface LoadIncrease {
  exerciseName: string;
  previousWeight: number;
  newWeight: number;
}

interface DayDetails {
  dateString: string; // YYYY-MM-DD
  trained: boolean;
  planned: boolean;
  missed: boolean;
  workoutName?: string;
  durationMinutes?: number;
  increases: LoadIncrease[];
  sessionNotes?: string;
  exercisesLogged: { name: string; sets: number; reps: number; weight?: number }[];
}

export const WorkoutCalendar: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Target Planned Weekdays (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Default to Mon, Wed, Fri (1, 3, 5)
  const [plannedDays, setPlannedDays] = useState<number[]>(() => {
    const saved = localStorage.getItem('ff_planned_days');
    return saved ? JSON.parse(saved) : [1, 3, 5];
  });

  // Selected Day Details Modal
  const [selectedDayInfo, setSelectedDayInfo] = useState<DayDetails | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.get<WorkoutSession[]>('/sessions');
      // Sort chronologically ascending to calculate progressive weight increases
      const sorted = data
        .filter(s => s.completedAt)
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
      setSessions(sorted);
    } catch (err: any) {
      setError('Erro ao carregar histórico de treinos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Persist planned days
  const handleTogglePlannedDay = (day: number) => {
    const newPlanned = plannedDays.includes(day)
      ? plannedDays.filter(d => d !== day)
      : [...plannedDays, day].sort();
    
    setPlannedDays(newPlanned);
    localStorage.setItem('ff_planned_days', JSON.stringify(newPlanned));
  };

  // Chronological calculation of weight increases
  const calculateLoadIncreases = () => {
    const increasesMap: { [dateString: string]: LoadIncrease[] } = {};
    const maxWeights: { [exerciseName: string]: number } = {};

    sessions.forEach(session => {
      if (!session.completedAt) return;
      const dateStr = new Date(session.completedAt).toISOString().split('T')[0];
      
      session.exercises.forEach(ex => {
        if (ex.weightUsed !== undefined && ex.weightUsed !== null && ex.weightUsed > 0) {
          const prevMax = maxWeights[ex.exerciseName];
          if (prevMax !== undefined && ex.weightUsed > prevMax) {
            // Found a weight progression!
            if (!increasesMap[dateStr]) {
              increasesMap[dateStr] = [];
            }
            increasesMap[dateStr].push({
              exerciseName: ex.exerciseName,
              previousWeight: prevMax,
              newWeight: ex.weightUsed
            });
            maxWeights[ex.exerciseName] = ex.weightUsed;
          } else if (prevMax === undefined) {
            // First time tracking this exercise's weight
            maxWeights[ex.exerciseName] = ex.weightUsed;
          }
        }
      });
    });

    return increasesMap;
  };

  const loadIncreases = calculateLoadIncreases();

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate date grid cells
  const getCalendarDays = () => {
    const cells: DayDetails[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay(); // 0-6
      
      // Format as local YYYY-MM-DD
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Check if user completed a session on this date
      const daysSessions = sessions.filter(s => {
        if (!s.completedAt) return false;
        const sDateStr = new Date(s.completedAt).toISOString().split('T')[0];
        return sDateStr === dateStr;
      });

      const trained = daysSessions.length > 0;
      const planned = plannedDays.includes(dayOfWeek);
      
      // A day is marked "missed" if it is in the past, it was a planned training day, and they did NOT train
      const isPast = dateStr < todayStr;
      const missed = isPast && planned && !trained;

      // Extract workout names and details
      const primarySession = daysSessions[0];
      const workoutName = primarySession?.workoutName;
      const durationMinutes = primarySession?.completedAt
        ? Math.round((new Date(primarySession.completedAt).getTime() - new Date(primarySession.startedAt).getTime()) / 60000)
        : undefined;

      const exercisesLogged = primarySession?.exercises.map(e => ({
        name: e.exerciseName,
        sets: e.setsCompleted,
        reps: e.repsCompleted,
        weight: e.weightUsed
      })) || [];

      cells.push({
        dateString: dateStr,
        trained,
        planned,
        missed,
        workoutName,
        durationMinutes,
        increases: loadIncreases[dateStr] || [],
        sessionNotes: primarySession?.notes,
        exercisesLogged
      });
    }

    return cells;
  };

  const calendarDays = getCalendarDays();

  // Streak calculations
  const calculateStreak = () => {
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Create a Set of all training dates for fast lookups
    const trainingDates = new Set(
      sessions.map(s => new Date(s.completedAt!).toISOString().split('T')[0])
    );

    let checkDate = new Date(today);
    
    // Check if trained today or yesterday
    const todayStr = checkDate.toISOString().split('T')[0];
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split('T')[0];

    const hasTrainedTodayOrYesterday = trainingDates.has(todayStr) || trainingDates.has(yesterdayStr);
    if (!hasTrainedTodayOrYesterday) return 0;

    // Reset checkDate to today and count backwards
    checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (trainingDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If not trained on checkDate, see if it was a planned day
        const dayOfWeek = checkDate.getDay();
        const wasPlanned = plannedDays.includes(dayOfWeek);
        
        // If it was a planned day, the streak is broken. 
        // If it was a rest day, they can skip it without breaking the streak!
        if (wasPlanned) {
          break;
        } else {
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
      
      // Safety exit
      if (currentStreak > 365) break;
    }

    return currentStreak;
  };

  const streak = calculateStreak();

  // Consistency Score: percentage of planned days met in the last 30 days
  const calculateConsistency = () => {
    const today = new Date();
    let plannedMet = 0;
    let totalPlannedDays = 0;

    // Set of training dates
    const trainingDates = new Set(
      sessions.map(s => new Date(s.completedAt!).toISOString().split('T')[0])
    );

    for (let i = 1; i <= 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      if (plannedDays.includes(dayOfWeek)) {
        totalPlannedDays++;
        if (trainingDates.has(dateStr)) {
          plannedMet++;
        }
      }
    }

    return totalPlannedDays > 0 ? Math.round((plannedMet / totalPlannedDays) * 100) : 100;
  };

  const consistencyScore = calculateConsistency();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando seu histórico e calendário...</p>
      </div>
    );
  }

  // Weekdays header labels
  const weekdaysPortuguese = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Calendário de Consistência</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Acompanhe suas sequências de treino, dias perdidos e progressão de cargas.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Streak and Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        {/* Streak Panel */}
        <div className="glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)',
            color: '#f97316',
            padding: '12px',
            borderRadius: '14px',
            boxShadow: '0 0 15px rgba(249, 115, 22, 0.15)'
          }}>
            <Flame size={32} className="animate-pulse-glow" style={{ animationDuration: '1s' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sequência Ativa</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{streak} {streak === 1 ? 'Dia' : 'Dias'}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {streak > 0 ? 'Mantendo o foco correto! 🔥' : 'Faça seu treino hoje! 💪'}
            </p>
          </div>
        </div>

        {/* Consistency Panel */}
        <div className="glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(52, 211, 153, 0.2) 100%)',
            color: '#34d399',
            padding: '12px',
            borderRadius: '14px'
          }}>
            <Award size={32} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Consistência (30 dias)</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{consistencyScore}%</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Meta de planned days concluída.
            </p>
          </div>
        </div>
      </div>

      <div className="responsive-grid-2">
        
        {/* Main Calendar View Card */}
        <div className="glass" style={{ padding: '24px' }}>
          
          {/* Calendar Header Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={20} color="var(--primary-hover)" />
              {monthNames[month]} {year}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={handlePrevMonth} style={{ padding: '8px 12px' }}>
                <ChevronLeft size={16} />
              </button>
              <button className="btn btn-secondary" onClick={handleNextMonth} style={{ padding: '8px 12px' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Portuguese Weekdays Labels Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '10px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            paddingBottom: '8px'
          }}>
            {weekdaysPortuguese.map(w => <div key={w}>{w}</div>)}
          </div>

          {/* Days Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            minHeight: '260px'
          }}>
            {/* Empty offset cells for month start */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`offset-${idx}`} style={{ background: 'transparent' }} />
            ))}

            {/* Actual Month Days */}
            {calendarDays.map(day => {
              const dayNum = parseInt(day.dateString.split('-')[2]);
              const hasPR = day.increases.length > 0;
              
              // Decide background styling based on status
              let bg = 'rgba(255, 255, 255, 0.02)';
              let border = '1px solid rgba(255, 255, 255, 0.05)';
              let color = 'var(--text-primary)';
              
              if (day.trained) {
                // Completed workout
                bg = 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)';
                border = '1px solid rgba(16, 185, 129, 0.35)';
              } else if (day.missed) {
                // Missed planned workout
                bg = 'rgba(239, 68, 68, 0.06)';
                border = '1px solid rgba(239, 68, 68, 0.3)';
                color = 'rgba(255, 255, 255, 0.8)';
              } else if (day.planned) {
                // Planned day in future/today (outline)
                border = '1px dashed rgba(147, 51, 234, 0.3)';
              }

              return (
                <div
                  key={day.dateString}
                  onClick={() => (day.trained || day.missed) && setSelectedDayInfo(day)}
                  style={{
                    background: bg,
                    border: border,
                    borderRadius: '10px',
                    padding: '10px 8px',
                    minHeight: '65px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    cursor: (day.trained || day.missed) ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    color: color,
                    position: 'relative'
                  }}
                  className={(day.trained || day.missed) ? 'glass' : ''}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{dayNum}</span>

                  <div style={{ display: 'flex', gap: '4px', alignSelf: 'flex-end', marginTop: '4px' }}>
                    {day.trained && <Dumbbell size={14} color="var(--success)" />}
                    {day.missed && <AlertTriangle size={14} color="var(--danger)" />}
                    {hasPR && (
                      <TrendingUp 
                        size={14} 
                        color="#fbbf24" 
                        style={{ filter: 'drop-shadow(0 0 2px rgba(251,191,36,0.5))' }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)' }} />
              Treino Realizado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }} />
              Dia Perdido (Planejado)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1px dashed rgba(147, 51, 234, 0.4)' }} />
              Dia de Treino Planejado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="#fbbf24" />
              Progressão de Carga (PR)
            </div>
          </div>
        </div>

        {/* Planned Weekdays Config Card */}
        <div className="glass" style={{ padding: '24px', alignSelf: 'start' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={18} color="var(--secondary)" />
            Planejamento de Dias de Treino
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Selecione quais dias da semana você planeja treinar. Os dias planejados que ficarem em branco no histórico contarão como "Dias Perdidos".
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weekdaysPortuguese.map((dayLabel, index) => {
              const isPlanned = plannedDays.includes(index);
              return (
                <div
                  key={dayLabel}
                  onClick={() => handleTogglePlannedDay(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isPlanned ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.01)',
                    border: isPlanned ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{dayLabel}</span>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: isPlanned ? 'none' : '2px solid rgba(255,255,255,0.2)',
                    background: isPlanned ? 'var(--secondary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '0.7rem'
                  }}>
                    {isPlanned && '✓'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* MODAL: Day Details */}
      {selectedDayInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-premium" style={{ width: '100%', maxWidth: '600px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Detalhes do Dia</span>
                <h3 style={{ fontSize: '1.3rem' }}>
                  {new Date(selectedDayInfo.dateString + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <button onClick={() => setSelectedDayInfo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Status Section */}
              <div style={{
                background: selectedDayInfo.trained ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${selectedDayInfo.trained ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {selectedDayInfo.trained ? (
                  <>
                    <CheckCircle color="var(--success)" size={24} />
                    <div>
                      <h4 style={{ color: '#ffffff' }}>Treino Executado!</h4>
                      <p style={{ fontSize: '0.85rem' }}>Você treinou a ficha: <strong>{selectedDayInfo.workoutName}</strong></p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle color="var(--danger)" size={24} />
                    <div>
                      <h4 style={{ color: '#ffffff' }}>Dia de Treino Perdido</h4>
                      <p style={{ fontSize: '0.85rem' }}>Este dia estava programado na sua agenda, mas não registrou treinos.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Progressions Section */}
              {selectedDayInfo.increases.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '1rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={16} /> Progressão de Carga Realizada!
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDayInfo.increases.map((inc, index) => (
                      <div key={index} style={{
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.88rem'
                      }}>
                        <span>{inc.exerciseName}</span>
                        <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                          {inc.previousWeight}kg ➔ {inc.newWeight}kg (+{inc.newWeight - inc.previousWeight}kg)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Workout Log details */}
              {selectedDayInfo.trained && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                    Resumo do Treino
                  </h4>
                  
                  {selectedDayInfo.durationMinutes && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} /> Tempo total de execução: {selectedDayInfo.durationMinutes} minutos
                    </div>
                  )}

                  {selectedDayInfo.sessionNotes && (
                    <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                      Anotações: "{selectedDayInfo.sessionNotes}"
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {selectedDayInfo.exercisesLogged.map((ex, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.01)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.02)',
                        fontSize: '0.85rem'
                      }}>
                        <span>{ex.name}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {ex.sets}x{ex.reps} reps {ex.weight ? `@ ${ex.weight} kg` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-secondary" onClick={() => setSelectedDayInfo(null)} style={{ marginTop: '10px' }}>
                Fechar
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
