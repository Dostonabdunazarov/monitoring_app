using System.Security.Claims;

namespace IoT.Shared.Security;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetTenantId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirst("tenant_id")?.Value;
        return Guid.TryParse(value, out var tenantId) ? tenantId : null;
    }
}
