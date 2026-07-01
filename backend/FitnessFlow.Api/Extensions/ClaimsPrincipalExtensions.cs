using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace FitnessFlow.Api.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static Guid? GetUserId(this ClaimsPrincipal principal)
        {
            var value = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            
            return Guid.TryParse(value, out var id) ? id : null;
        }

        public static string? GetUserRole(this ClaimsPrincipal principal)
        {
            return principal.FindFirst(ClaimTypes.Role)?.Value;
        }

        public static bool IsAdmin(this ClaimsPrincipal principal)
        {
            return principal.GetUserRole() == Models.Roles.Admin;
        }
    }
}
