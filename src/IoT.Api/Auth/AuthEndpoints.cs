using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using IoT.Domain.Entities;
using IoT.Domain.Enums;
using IoT.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace IoT.Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var authGroup = endpoints.MapGroup("/api/auth").WithTags("Auth");

        authGroup.MapPost("/register", RegisterAsync)
            .WithName("RegisterUser");

        authGroup.MapPost("/login", LoginAsync)
            .WithName("LoginUser");

        authGroup.MapGet("/me", GetCurrentUserAsync)
            .WithName("GetCurrentUser")
            .RequireAuthorization();

        return endpoints;
    }

    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        AppDbContext dbContext,
        IPasswordHashingService passwordHashingService,
        IJwtTokenService jwtTokenService,
        CancellationToken cancellationToken)
    {
        var validationErrors = ValidateRegisterRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var normalizedEmail = NormalizeEmail(request.Email);
        var emailExists = await dbContext.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (emailExists)
        {
            return Results.Conflict(new ProblemEnvelope("A user with this email already exists."));
        }

        var createdAt = DateTimeOffset.UtcNow;
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = request.TenantName.Trim(),
            CreatedAt = createdAt
        };

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = normalizedEmail,
            PasswordHash = passwordHashingService.HashPassword(request.Password),
            Role = UserRole.Admin,
            CreatedAt = createdAt,
            Tenant = tenant
        };

        dbContext.Tenants.Add(tenant);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        var token = jwtTokenService.CreateToken(user);

        return Results.Created(
            "/api/auth/me",
            new AuthResponse(token.AccessToken, token.ExpiresAt, MapUser(user, tenant.Name)));
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        AppDbContext dbContext,
        IPasswordHashingService passwordHashingService,
        IJwtTokenService jwtTokenService,
        CancellationToken cancellationToken)
    {
        var validationErrors = ValidateLoginRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var normalizedEmail = NormalizeEmail(request.Email);
        var user = await dbContext.Users
            .AsNoTracking()
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null || !passwordHashingService.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Results.Unauthorized();
        }

        var token = jwtTokenService.CreateToken(user);

        return Results.Ok(new AuthResponse(token.AccessToken, token.ExpiresAt, MapUser(user, user.Tenant.Name)));
    }

    private static async Task<IResult> GetCurrentUserAsync(
        ClaimsPrincipal claimsPrincipal,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var userIdClaim =
            claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            claimsPrincipal.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Results.Unauthorized();
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(MapUser(user, user.Tenant.Name));
    }

    private static Dictionary<string, string[]> ValidateRegisterRequest(RegisterRequest request)
    {
        var errors = ValidateLoginRequest(new LoginRequest(request.Email, request.Password));

        if (string.IsNullOrWhiteSpace(request.TenantName))
        {
            errors["tenantName"] = ["Tenant name is required."];
        }
        else if (request.TenantName.Trim().Length < 3)
        {
            errors["tenantName"] = ["Tenant name must be at least 3 characters long."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidateLoginRequest(LoginRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = ["Email is required."];
        }
        else if (!new EmailAddressAttribute().IsValid(request.Email))
        {
            errors["email"] = ["Email format is invalid."];
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            errors["password"] = ["Password is required."];
        }
        else if (request.Password.Length < 8)
        {
            errors["password"] = ["Password must be at least 8 characters long."];
        }

        return errors;
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private static AuthUserResponse MapUser(User user, string tenantName)
    {
        return new AuthUserResponse(user.Id, user.TenantId, tenantName, user.Email, user.Role.ToString());
    }
}

public sealed record RegisterRequest(string TenantName, string Email, string Password);

public sealed record LoginRequest(string Email, string Password);

public sealed record AuthResponse(string AccessToken, DateTimeOffset ExpiresAt, AuthUserResponse User);

public sealed record AuthUserResponse(Guid Id, Guid TenantId, string TenantName, string Email, string Role);

public sealed record ProblemEnvelope(string Message);
