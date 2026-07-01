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
    public static class WorkoutEndpoints
    {
        public static void MapWorkoutEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/workouts")
                .WithTags("Workouts")
                .RequireAuthorization();

            group.MapGet("/", GetWorkoutsAsync);
            group.MapGet("/{id:guid}", GetWorkoutByIdAsync);
            group.MapPost("/", CreateWorkoutAsync);
            group.MapPut("/{id:guid}", UpdateWorkoutAsync);
            group.MapDelete("/{id:guid}", DeleteWorkoutAsync);
        }

        private static async Task<IResult> GetWorkoutsAsync(
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            IQueryable<Workout> query = db.Workouts
                .Include(w => w.Exercises)
                .ThenInclude(we => we.Exercise);

            // If user is Admin, show all. If normal user, show templates (UserId == null) and their own workouts
            if (!principal.IsAdmin())
            {
                query = query.Where(w => w.UserId == null || w.UserId == userId.Value);
            }

            var workouts = await query
                .OrderBy(w => w.Name)
                .ToListAsync();

            var dtos = workouts.Select(MapToDto).ToList();
            return Results.Ok(dtos);
        }

        private static async Task<IResult> GetWorkoutByIdAsync(
            Guid id,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var workout = await db.Workouts
                .Include(w => w.Exercises)
                .ThenInclude(we => we.Exercise)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workout == null) return Results.NotFound("Workout not found.");

            // Enforce permissions for non-admins
            if (!principal.IsAdmin() && workout.UserId != null && workout.UserId != userId.Value)
            {
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);
            }

            return Results.Ok(MapToDto(workout));
        }

        private static async Task<IResult> CreateWorkoutAsync(
            CreateWorkoutDto dto,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return Results.BadRequest("Workout Name is required.");
            }

            // If user is not admin, force the UserId to be their own (they can't create global templates or workouts for others)
            Guid? targetUserId = dto.UserId;
            if (!principal.IsAdmin())
            {
                targetUserId = userId.Value;
            }

            var workout = new Workout
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Description = dto.Description,
                UserId = targetUserId,
                CreatedById = userId.Value,
                CreatedAt = DateTime.UtcNow
            };

            if (dto.Exercises != null)
            {
                foreach (var exDto in dto.Exercises)
                {
                    workout.Exercises.Add(new WorkoutExercise
                    {
                        WorkoutId = workout.Id,
                        ExerciseId = exDto.ExerciseId,
                        Order = exDto.Order,
                        Sets = exDto.Sets,
                        Reps = exDto.Reps,
                        Weight = exDto.Weight,
                        DurationSeconds = exDto.DurationSeconds,
                        RestBetweenSetsSeconds = exDto.RestBetweenSetsSeconds,
                        RestAfterExerciseSeconds = exDto.RestAfterExerciseSeconds
                    });
                }
            }

            db.Workouts.Add(workout);
            await db.SaveChangesAsync();

            // Reload to fetch exercise names
            var createdWorkout = await db.Workouts
                .Include(w => w.Exercises)
                .ThenInclude(we => we.Exercise)
                .FirstAsync(w => w.Id == workout.Id);

            return Results.Created($"/api/workouts/{workout.Id}", MapToDto(createdWorkout));
        }

        private static async Task<IResult> UpdateWorkoutAsync(
            Guid id,
            CreateWorkoutDto dto,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var workout = await db.Workouts
                .Include(w => w.Exercises)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workout == null) return Results.NotFound("Workout not found.");

            // Enforce permissions: 
            // Users can only edit their own workouts. Admins can only edit template workouts.
            if (workout.UserId != null)
            {
                if (workout.UserId != userId.Value)
                {
                    return Results.Json(new { message = "Forbidden. Only the owner can edit this workout." }, statusCode: 403);
                }
            }
            else
            {
                if (!principal.IsAdmin())
                {
                    return Results.Json(new { message = "Forbidden. Only admins can edit template workouts." }, statusCode: 403);
                }
            }

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return Results.BadRequest("Workout Name is required.");
            }

            workout.Name = dto.Name;
            workout.Description = dto.Description;
            
            // Admins can reassign workouts
            if (principal.IsAdmin())
            {
                workout.UserId = dto.UserId;
            }

            // Remove existing exercise associations
            db.WorkoutExercises.RemoveRange(workout.Exercises);

            // Add new ones
            if (dto.Exercises != null)
            {
                foreach (var exDto in dto.Exercises)
                {
                    db.WorkoutExercises.Add(new WorkoutExercise
                    {
                        WorkoutId = workout.Id,
                        ExerciseId = exDto.ExerciseId,
                        Order = exDto.Order,
                        Sets = exDto.Sets,
                        Reps = exDto.Reps,
                        Weight = exDto.Weight,
                        DurationSeconds = exDto.DurationSeconds,
                        RestBetweenSetsSeconds = exDto.RestBetweenSetsSeconds,
                        RestAfterExerciseSeconds = exDto.RestAfterExerciseSeconds
                    });
                }
            }

            await db.SaveChangesAsync();

            // Reload to fetch details
            var updatedWorkout = await db.Workouts
                .Include(w => w.Exercises)
                .ThenInclude(we => we.Exercise)
                .FirstAsync(w => w.Id == workout.Id);

            return Results.Ok(MapToDto(updatedWorkout));
        }

        private static async Task<IResult> DeleteWorkoutAsync(
            Guid id,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var workout = await db.Workouts
                .Include(w => w.Exercises)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workout == null) return Results.NotFound("Workout not found.");

            // Enforce permissions: 
            // Users can only delete their own workouts. Admins can only delete template workouts.
            if (workout.UserId != null)
            {
                if (workout.UserId != userId.Value)
                {
                    return Results.Json(new { message = "Forbidden. Only the owner can delete this workout." }, statusCode: 403);
                }
            }
            else
            {
                if (!principal.IsAdmin())
                {
                    return Results.Json(new { message = "Forbidden. Only admins can delete template workouts." }, statusCode: 403);
                }
            }

            db.WorkoutExercises.RemoveRange(workout.Exercises);
            db.Workouts.Remove(workout);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }

        private static WorkoutDto MapToDto(Workout workout) => new WorkoutDto(
            workout.Id,
            workout.Name,
            workout.Description,
            workout.UserId,
            workout.CreatedById,
            workout.CreatedAt,
            workout.Exercises.OrderBy(we => we.Order).Select(we => new WorkoutExerciseDto(
                we.ExerciseId,
                we.Exercise?.Name ?? "Exercise Deleted",
                we.Exercise?.Description ?? string.Empty,
                we.Exercise?.Category ?? string.Empty,
                we.Order,
                we.Sets,
                we.Reps,
                we.Weight,
                we.DurationSeconds,
                we.RestBetweenSetsSeconds,
                we.RestAfterExerciseSeconds
            )).ToList()
        );
    }
}
