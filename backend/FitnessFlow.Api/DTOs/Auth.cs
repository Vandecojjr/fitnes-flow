using System;

namespace FitnessFlow.Api.DTOs
{
    public record LoginRequest(string UsernameOrEmail, string Password);

    public record LoginResponse(string Token, UserDto User);

    public record RegisterRequest(string Username, string Email, string Password, string Role = "User");

    public record UserDto(Guid Id, string Username, string Email, string Role, DateTime CreatedAt);
}
