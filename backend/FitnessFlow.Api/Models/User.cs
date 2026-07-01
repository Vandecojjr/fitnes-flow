using System;
using System.Text.Json.Serialization;

namespace FitnessFlow.Api.Models
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        
        public string Role { get; set; } = Roles.User; // "Admin" or "User"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class Roles
    {
        public const string Admin = "Admin";
        public const string User = "User";
    }
}
