export interface User {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'User';
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  defaultDurationSeconds: number;
  category: string;
  createdAt: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseDescription: string;
  exerciseCategory: string;
  order: number;
  sets: number;
  reps: number;
  weight?: number;
  durationSeconds?: number;
  restBetweenSetsSeconds: number;
  restAfterExerciseSeconds: number;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  userId?: string;
  createdById: string;
  createdAt: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutSessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed?: number;
  durationSeconds: number;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  completedAt?: string;
  notes: string;
  exercises: WorkoutSessionExercise[];
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string;
  isCompleted: boolean;
  createdAt: string;
}
