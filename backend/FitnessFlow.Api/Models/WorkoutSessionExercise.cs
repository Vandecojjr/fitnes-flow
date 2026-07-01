using System;

namespace FitnessFlow.Api.Models
{
    public class WorkoutSessionExercise
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid WorkoutSessionId { get; set; }
        
        public Guid ExerciseId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        
        public int SetsCompleted { get; set; }
        public int RepsCompleted { get; set; }
        public double? WeightUsed { get; set; }
        public int DurationSeconds { get; set; } // Time spent on this exercise in seconds
    }
}
