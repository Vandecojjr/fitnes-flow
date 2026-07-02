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
    public static class UserEndpoints
    {
        public static void MapUserEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/users")
                .WithTags("Users")
                .RequireAuthorization();

            group.MapGet("/", GetUsersAsync);
            group.MapPost("/", CreateUserAsync);
            group.MapDelete("/{id:guid}", DeleteUserAsync);
        }

        private static async Task<IResult> GetUsersAsync(
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            if (!principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden. Admin access required." }, statusCode: 403);
            }

            var users = await db.Users
                .AsNoTracking()
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserDto(u.Id, u.Username, u.Email, u.Role, u.CreatedAt))
                .ToListAsync();

            return Results.Ok(users);
        }

        private static async Task<IResult> CreateUserAsync(
            RegisterRequest request,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            if (!principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden. Admin access required." }, statusCode: 403);
            }

            if (string.IsNullOrWhiteSpace(request.Username) || 
                string.IsNullOrWhiteSpace(request.Email) || 
                string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest("Username, Email, and Password are required.");
            }

            var normalizedEmail = request.Email.ToUpperInvariant();
            var normalizedUsername = request.Username.ToUpperInvariant();

            if (await db.Users.AnyAsync(u => u.Email.ToUpper() == normalizedEmail || u.Username.ToUpper() == normalizedUsername))
            {
                return Results.Conflict("Username or Email already exists.");
            }

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role == Roles.Admin ? Roles.Admin : Roles.User
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            var userDto = new UserDto(user.Id, user.Username, user.Email, user.Role, user.CreatedAt);
            return Results.Created($"/api/users/{user.Id}", userDto);
        }

        private static async Task<IResult> DeleteUserAsync(
            Guid id,
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            if (!principal.IsAdmin())
            {
                return Results.Json(new { message = "Forbidden. Admin access required." }, statusCode: 403);
            }

            var currentUserId = principal.GetUserId();
            if (currentUserId == id)
            {
                return Results.BadRequest("You cannot delete your own account.");
            }

            var user = await db.Users.FindAsync(id);
            if (user == null) return Results.NotFound("User not found.");

            // Delete associated workouts, sessions, goals to maintain referential integrity
            var workouts = await db.Workouts.Where(w => w.UserId == id).ToListAsync();
            db.Workouts.RemoveRange(workouts);

            var sessions = await db.WorkoutSessions.Where(s => s.UserId == id).ToListAsync();
            db.WorkoutSessions.RemoveRange(sessions);

            var goals = await db.Goals.Where(g => g.UserId == id).ToListAsync();
            db.Goals.RemoveRange(goals);

            db.Users.Remove(user);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }
    }
}
