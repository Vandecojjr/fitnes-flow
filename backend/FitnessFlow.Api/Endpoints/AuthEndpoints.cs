using System;
using System.Security.Claims;
using System.Threading.Tasks;
using FitnessFlow.Api.Data;
using FitnessFlow.Api.DTOs;
using FitnessFlow.Api.Extensions;
using FitnessFlow.Api.Models;
using FitnessFlow.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace FitnessFlow.Api.Endpoints
{
    public static class AuthEndpoints
    {
        public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/auth").WithTags("Auth");

            group.MapPost("/register", RegisterAsync);
            group.MapPost("/login", LoginAsync);
            group.MapGet("/me", GetMeAsync).RequireAuthorization();
        }

        private static async Task<IResult> RegisterAsync(
            RegisterRequest request, 
            FitnessFlowDbContext db, 
            ITokenService tokenService,
            ClaimsPrincipal principal)
        {
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

            // Role enforcement: Only admins can register other admins
            var role = Roles.User;
            if (request.Role == Roles.Admin)
            {
                if (principal.Identity?.IsAuthenticated == true && principal.IsAdmin())
                {
                    role = Roles.Admin;
                }
                else
                {
                    return Results.Json(new { message = "Only administrators can create admin accounts." }, statusCode: 403);
                }
            }

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = role
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            var token = tokenService.GenerateToken(user);
            var userDto = new UserDto(user.Id, user.Username, user.Email, user.Role, user.CreatedAt);

            return Results.Ok(new LoginResponse(token, userDto));
        }

        private static async Task<IResult> LoginAsync(
            LoginRequest request, 
            FitnessFlowDbContext db, 
            ITokenService tokenService)
        {
            if (string.IsNullOrWhiteSpace(request.UsernameOrEmail) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest("Username/Email and Password are required.");
            }

            var input = request.UsernameOrEmail.ToUpperInvariant();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username.ToUpper() == input || u.Email.ToUpper() == input);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Results.BadRequest("Invalid username, email, or password.");
            }

            var token = tokenService.GenerateToken(user);
            var userDto = new UserDto(user.Id, user.Username, user.Email, user.Role, user.CreatedAt);

            return Results.Ok(new LoginResponse(token, userDto));
        }

        private static async Task<IResult> GetMeAsync(
            ClaimsPrincipal principal, 
            FitnessFlowDbContext db)
        {
            var userId = principal.GetUserId();
            if (userId == null) return Results.Unauthorized();

            var user = await db.Users.FindAsync(userId.Value);
            if (user == null) return Results.NotFound("User not found.");

            var userDto = new UserDto(user.Id, user.Username, user.Email, user.Role, user.CreatedAt);
            return Results.Ok(userDto);
        }
    }
}
