using System;
using System.Collections.Generic;

namespace FitnessFlow.Api.DTOs
{
    public record WorkoutSessionDto(
        Guid Id,
        Guid UserId,
        Guid WorkoutId,
        string WorkoutName,
        DateTime StartedAt,
        DateTime? CompletedAt,
        string Notes,
        List<WorkoutSessionExerciseDto> Exercises
    );

    public record WorkoutSessionExerciseDto(
        Guid Id,
        Guid ExerciseId,
        string ExerciseName,
        int SetsCompleted,
        int RepsCompleted,
        double? WeightUsed,
        int DurationSeconds
    );

    public record StartWorkoutSessionDto(Guid WorkoutId);

    public record CompleteWorkoutSessionDto(
        string Notes,
        List<CompleteWorkoutSessionExerciseDto> Exercises
    );

    public record CompleteWorkoutSessionExerciseDto(
        Guid ExerciseId,
        string ExerciseName,
        int SetsCompleted,
        int RepsCompleted,
        double? WeightUsed,
        int DurationSeconds
    );
}
