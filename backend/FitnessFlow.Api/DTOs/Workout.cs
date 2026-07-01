using System;
using System.Collections.Generic;

namespace FitnessFlow.Api.DTOs
{
    public record WorkoutDto(
        Guid Id,
        string Name,
        string Description,
        Guid? UserId,
        Guid CreatedById,
        DateTime CreatedAt,
        List<WorkoutExerciseDto> Exercises
    );

    public record WorkoutExerciseDto(
        Guid ExerciseId,
        string ExerciseName,
        string ExerciseDescription,
        string ExerciseCategory,
        int Order,
        int Sets,
        int Reps,
        double? Weight,
        int? DurationSeconds,
        int RestBetweenSetsSeconds,
        int RestAfterExerciseSeconds
    );

    public record CreateWorkoutDto(
        string Name,
        string Description,
        Guid? UserId,
        List<CreateWorkoutExerciseDto> Exercises
    );

    public record CreateWorkoutExerciseDto(
        Guid ExerciseId,
        int Order,
        int Sets,
        int Reps,
        double? Weight,
        int? DurationSeconds,
        int RestBetweenSetsSeconds,
        int RestAfterExerciseSeconds
    );
}
