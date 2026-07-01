using System;

namespace FitnessFlow.Api.DTOs
{
    public record GoalDto(
        Guid Id,
        Guid UserId,
        string Title,
        string Description,
        double TargetValue,
        double CurrentValue,
        string Unit,
        DateTime TargetDate,
        bool IsCompleted,
        DateTime CreatedAt
    );

    public record CreateGoalDto(
        string Title,
        string Description,
        double TargetValue,
        double CurrentValue,
        string Unit,
        DateTime TargetDate
    );

    public record UpdateGoalDto(
        double CurrentValue,
        bool IsCompleted
    );
}
