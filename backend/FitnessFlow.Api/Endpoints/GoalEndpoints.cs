using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FitnessFlow.Api.Data;
using FitnessFlow.Api.DTOs;
using FitnessFlow.Api.Extensions;
using FitnessFlow.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace FitnessFlow.Api.Endpoints
{
    public static class GoalEndpoints
    {
        public static void MapGoalEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/goals")
                .WithTags("Goals")
                .RequireAuthorization();

            group.MapGet("/", GetGoalsAsync);
            group.MapPost("/", CreateGoalAsync);
            group.MapPut("/{id:guid}", UpdateGoalAsync);
            group.MapDelete("/{id:guid}", DeleteGoalAsync);
        }

        private static async Task<IResult> GetGoalsAsync(
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var goals = await db.Goals
                .Where(g => g.UserId == userId.Value)
                .OrderBy(g => g.TargetDate)
                .Select(g => new GoalDto(
                    g.Id,
                    g.UserId,
                    g.Title,
                    g.Description,
                    g.TargetValue,
                    g.CurrentValue,
                    g.Unit,
                    g.TargetDate,
                    g.IsCompleted,
                    g.CreatedAt
                ))
                .ToListAsync();

            return Results.Ok(goals);
        }

        private static async Task<IResult> CreateGoalAsync(
            CreateGoalDto dto,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                return Results.BadRequest("Goal Title is required.");
            }

            var goal = new Goal
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                Title = dto.Title,
                Description = dto.Description ?? string.Empty,
                TargetValue = dto.TargetValue,
                CurrentValue = dto.CurrentValue,
                Unit = dto.Unit ?? string.Empty,
                TargetDate = dto.TargetDate,
                IsCompleted = dto.CurrentValue >= dto.TargetValue,
                CreatedAt = DateTime.UtcNow
            };

            db.Goals.Add(goal);
            await db.SaveChangesAsync();

            var goalDto = MapToDto(goal);
            return Results.Created($"/api/goals/{goal.Id}", goalDto);
        }

        private static async Task<IResult> UpdateGoalAsync(
            Guid id,
            UpdateGoalDto dto,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var goal = await db.Goals.FindAsync(id);
            if (goal == null) return Results.NotFound("Goal not found.");

            if (goal.UserId != userId.Value && !principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);
            }

            goal.CurrentValue = dto.CurrentValue;
            goal.IsCompleted = dto.IsCompleted || dto.CurrentValue >= goal.TargetValue;

            await db.SaveChangesAsync();

            return Results.Ok(MapToDto(goal));
        }

        private static async Task<IResult> DeleteGoalAsync(
            Guid id,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var goal = await db.Goals.FindAsync(id);
            if (goal == null) return Results.NotFound("Goal not found.");

            if (goal.UserId != userId.Value && !principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);
            }

            db.Goals.Remove(goal);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }

        private static GoalDto MapToDto(Goal g) => new GoalDto(
            g.Id,
            g.UserId,
            g.Title,
            g.Description,
            g.TargetValue,
            g.CurrentValue,
            g.Unit,
            g.TargetDate,
            g.IsCompleted,
            g.CreatedAt
        );
    }
}
