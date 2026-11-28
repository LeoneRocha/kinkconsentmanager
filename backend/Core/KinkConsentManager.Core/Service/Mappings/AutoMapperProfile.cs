using AutoMapper;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Entities;

namespace KinkConsentManager.Core.Service.Mappings;

/// <summary>
/// Perfil de mapeamento do AutoMapper para entidades e DTOs do <c>KinkConsentManager</c>.
/// </summary>
public sealed class AutoMapperProfile : Profile
{
    /// <summary>
    /// Inicializa os mapeamentos de domínio para contratos públicos da API.
    /// </summary>
    public AutoMapperProfile()
    {
        CreateMap<UserKink, UserKinkDto>();
        CreateMap<UserKinkCheclist, UserKinkChecklistDto>();
    }
}
