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
    public static class WorkoutSessionEndpoints
    {
        public static void MapWorkoutSessionEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/sessions")
                .WithTags("Workout Sessions")
                .RequireAuthorization();

            group.MapGet("/", GetSessionsHistoryAsync);
            group.MapGet("/active", GetActiveSessionAsync);
            group.MapPost("/start", StartSessionAsync);
            group.MapPost("/{id:guid}/complete", CompleteSessionAsync);
            group.MapDelete("/{id:guid}", CancelSessionAsync);
        }

        private static async Task<IResult> GetSessionsHistoryAsync(
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            IQueryable<WorkoutSession> query = db.WorkoutSessions
                .AsNoTracking()
                .Include(ws => ws.Exercises);

            // Admins can see all, users only see theirs
            if (!principal.IsAdmin())
            {
                query = query.Where(ws => ws.UserId == userId.Value);
            }

            var sessions = await query
                .OrderByDescending(ws => ws.StartedAt)
                .ToListAsync();

            var dtos = sessions.Select(MapToDto).ToList();
            return Results.Ok(dtos);
        }

        private static async Task<IResult> GetActiveSessionAsync(
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var activeSession = await db.WorkoutSessions
                .AsNoTracking()
                .Include(ws => ws.Exercises)
                .FirstOrDefaultAsync(ws => ws.UserId == userId.Value && ws.CompletedAt == null);

            if (activeSession == null)
            {
                return Results.NotFound(new { message = "No active workout session." });
            }

            return Results.Ok(MapToDto(activeSession));
        }

        private static async Task<IResult> StartSessionAsync(
            StartWorkoutSessionDto dto,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            // Check if there is already an active session
            var hasActive = await db.WorkoutSessions.AnyAsync(ws => ws.UserId == userId.Value && ws.CompletedAt == null);
            if (hasActive)
            {
                return Results.BadRequest(new { message = "You already have an active workout session. Complete or cancel it first." });
            }

            var workout = await db.Workouts.FindAsync(dto.WorkoutId);
            if (workout == null) return Results.NotFound("Workout template not found.");

            var session = new WorkoutSession
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                WorkoutId = workout.Id,
                WorkoutName = workout.Name,
                StartedAt = DateTime.UtcNow,
                Notes = string.Empty
            };

            db.WorkoutSessions.Add(session);
            await db.SaveChangesAsync();

            return Results.Ok(MapToDto(session));
        }

        private static async Task<IResult> CompleteSessionAsync(
            Guid id,
            CompleteWorkoutSessionDto dto,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var session = await db.WorkoutSessions
                .Include(s => s.Exercises)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (session == null) return Results.NotFound("Workout session not found.");
            
            if (session.UserId != userId.Value)
            {
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);
            }

            if (session.CompletedAt != null)
            {
                return Results.BadRequest(new { message = "Session is already completed." });
            }

            session.CompletedAt = DateTime.UtcNow;
            session.Notes = dto.Notes ?? string.Empty;

            if (dto.Exercises != null)
            {
                foreach (var exDto in dto.Exercises)
                {
                    session.Exercises.Add(new WorkoutSessionExercise
                    {
                        Id = Guid.NewGuid(),
                        WorkoutSessionId = session.Id,
                        ExerciseId = exDto.ExerciseId,
                        ExerciseName = exDto.ExerciseName,
                        SetsCompleted = exDto.SetsCompleted,
                        RepsCompleted = exDto.RepsCompleted,
                        WeightUsed = exDto.WeightUsed,
                        DurationSeconds = exDto.DurationSeconds
                    });
                }
            }

            try
            {
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = $"Erro ao salvar no banco de dados: {ex.InnerException?.Message ?? ex.Message}" });
            }

            var reloadedSession = await db.WorkoutSessions
                .Include(s => s.Exercises)
                .FirstAsync(s => s.Id == session.Id);

            return Results.Ok(MapToDto(reloadedSession));
        }

        private static async Task<IResult> CancelSessionAsync(
            Guid id,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var session = await db.WorkoutSessions.FindAsync(id);
            if (session == null) return Results.NotFound("Workout session not found.");

            if (session.UserId != userId.Value && !principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);
            }

            db.WorkoutSessions.Remove(session);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }

        private static WorkoutSessionDto MapToDto(WorkoutSession session) => new WorkoutSessionDto(
            session.Id,
            session.UserId,
            session.WorkoutId,
            session.WorkoutName,
            session.StartedAt,
            session.CompletedAt,
            session.Notes,
            session.Exercises.Select(e => new WorkoutSessionExerciseDto(
                e.Id,
                e.ExerciseId,
                e.ExerciseName,
                e.SetsCompleted,
                e.RepsCompleted,
                e.WeightUsed,
                e.DurationSeconds
            )).ToList()
        );
    }
}
