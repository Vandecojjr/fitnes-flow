using System;
using System.Collections.Generic;

namespace FitnessFlow.Api.Models
{
    public class Workout
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        
        // If null, it is a global template created by admin. 
        // If set, it belongs to a specific user.
        public Guid? UserId { get; set; }
        
        public Guid CreatedById { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<WorkoutExercise> Exercises { get; set; } = new();
    }
}
