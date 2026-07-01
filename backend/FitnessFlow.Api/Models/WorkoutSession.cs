using System;
using System.Collections.Generic;

namespace FitnessFlow.Api.Models
{
    public class WorkoutSession
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid WorkoutId { get; set; }
        public string WorkoutName { get; set; } = string.Empty;
        
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        public string Notes { get; set; } = string.Empty;
        
        public List<WorkoutSessionExercise> Exercises { get; set; } = new();
    }
}
