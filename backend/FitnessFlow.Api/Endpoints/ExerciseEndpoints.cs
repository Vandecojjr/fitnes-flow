using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FitnessFlow.Api.Data;
using FitnessFlow.Api.Extensions;
using FitnessFlow.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace FitnessFlow.Api.Endpoints
{
    public static class ExerciseEndpoints
    {
        public static void MapExerciseEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/exercises")
                .WithTags("Exercises")
                .RequireAuthorization();

            group.MapGet("/", GetExercisesAsync);
            group.MapPost("/", CreateExerciseAsync);
            group.MapPut("/{id:guid}", UpdateExerciseAsync);
            group.MapDelete("/{id:guid}", DeleteExerciseAsync);
        }

        private static async Task<IResult> GetExercisesAsync(FitnessFlowDbContext db)
        {
            var exercises = await db.Exercises
                .OrderBy(e => e.Name)
                .ToListAsync();
            return Results.Ok(exercises);
        }

        private static async Task<IResult> CreateExerciseAsync(
            Exercise exercise,
            ClaimsPrincipal principal,
            FitnessFlowDbContext db)
        {
            if (!principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden. Admin access required." }, statusCode: 403);
            }

            if (string.IsNullOrWhiteSpace(exercise.Name))
            {
                return Results.BadRequest("Exercise Name is required.");
            }

            exercise.Id = Guid.NewGuid();
            exercise.CreatedAt = DateTime.UtcNow;

            db.Exercises.Add(exercise);
            await db.SaveChangesAsync();

            return Results.Created($"/api/exercises/{exercise.Id}", exercise);
        }

        private static async Task<IResult> UpdateExerciseAsync(
            Guid id,
            Exercise input,
            ClaimsPrincipal principal,
            FitnessFlowDbContext db)
        {
            if (!principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden. Admin access required." }, statusCode: 403);
            }

            var exercise = await db.Exercises.FindAsync(id);
            if (exercise == null) return Results.NotFound("Exercise not found.");

            if (string.IsNullOrWhiteSpace(input.Name))
            {
                return Results.BadRequest("Exercise Name is required.");
            }

            exercise.Name = input.Name;
            exercise.Description = input.Description;
            exercise.Category = input.Category;
            exercise.DefaultDurationSeconds = input.DefaultDurationSeconds;

            await db.SaveChangesAsync();

            return Results.Ok(exercise);
        }

        private static async Task<IResult> DeleteExerciseAsync(
            Guid id,
            ClaimsPrincipal principal,
            FitnessFlowDbContext db)
        {
            if (!principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden. Admin access required." }, statusCode: 403);
            }

            var exercise = await db.Exercises.FindAsync(id);
            if (exercise == null) return Results.NotFound("Exercise not found.");

            // Remove it from workout templates
            var workoutExercises = await db.WorkoutExercises.Where(we => we.ExerciseId == id).ToListAsync();
            db.WorkoutExercises.RemoveRange(workoutExercises);

            db.Exercises.Remove(exercise);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }
    }
}
