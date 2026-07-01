using System;

namespace FitnessFlow.Api.Models
{
    public class Exercise
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DefaultDurationSeconds { get; set; } = 60; // default time for timing
        public string Category { get; set; } = "Strength"; // Cardio, Strength, etc.
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
