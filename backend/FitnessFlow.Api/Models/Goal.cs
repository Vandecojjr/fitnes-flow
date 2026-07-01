using System;

namespace FitnessFlow.Api.Models
{
    public class Goal
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        
        public double TargetValue { get; set; }
        public double CurrentValue { get; set; }
        public string Unit { get; set; } = string.Empty; // kg, sessions, minutes, etc.
        
        public DateTime TargetDate { get; set; }
        public bool IsCompleted { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
