using System;

namespace FitnessFlow.Api.Models
{
    public class WorkoutExercise
    {
        public Guid WorkoutId { get; set; }
        public Workout? Workout { get; set; }

        public Guid ExerciseId { get; set; }
        public Exercise? Exercise { get; set; }

        public int Order { get; set; }
        public int Sets { get; set; } = 3;
        public int Reps { get; set; } = 10;
        public double? Weight { get; set; } // in kilograms
        public int? DurationSeconds { get; set; } // for timed exercises
        
        public int RestBetweenSetsSeconds { get; set; } = 60; // rest between sets
        public int RestAfterExerciseSeconds { get; set; } = 120; // rest after finishing all sets of this exercise
    }
}
