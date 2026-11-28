using System.Security.Claims;
using KinkConsentManager.API.Controllers.V1;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Service.Cqrs.Checklists.Commands;
using KinkConsentManager.Core.Service.Cqrs.Checklists.Queries;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.API.Tests.Controllers;

[TestFixture]
public sealed class ChecklistsControllerTests
{
    private Mock<IApplicationDispatcher> _dispatcherMock = null!;
    private ChecklistsController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        _dispatcherMock = new Mock<IApplicationDispatcher>(MockBehavior.Strict);
        _controller = new ChecklistsController(_dispatcherMock.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
    }

    [Test]
    public void Constructor_WhenDispatcherIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Instanciação de ChecklistsController sem IApplicationDispatcher.
        // Objetivo: Garantir validação explícita de ArgumentNullException no construtor.
        var act = () => new ChecklistsController(null!);

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("dispatcher");
    }

    [Test]
    public async Task GetCurrent_WhenAuthenticatedAndFound_ShouldDispatchQueryAndReturn200()
    {
        // Cenário: Usuário autenticado com claim nameid = 42 possuindo checklist salvo.
        // Objetivo: Despachar GetCurrentUserKinkChecklistQuery e retornar HTTP 200.
        SetAuthenticatedUser(42);
        var dto = new UserKinkChecklistDto(
            10,
            "1.0.0",
            "pt-BR",
            "{\"item_rope\":{\"primaryScale\":\"enjoy\"}}",
            DateTime.UtcNow,
            2,
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow);

        var response = ServiceResponse<UserKinkChecklistDto>.Ok(
            dto,
            "Checklist retrieved successfully.",
            ChecklistMessageKeys.ChecklistRetrieved);

        _dispatcherMock
            .Setup(d => d.QueryAsync(
                It.Is<GetCurrentUserKinkChecklistQuery>(q => q.UserKinkId == 42),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var actionResult = await _controller.GetCurrent(CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<UserKinkChecklistDto>>().Subject;
        payload.Success.Should().BeTrue();
        payload.Data.Should().Be(dto);
        _dispatcherMock.VerifyAll();
    }

    [TestCase(StatusCodes.Status200OK)]
    [TestCase(StatusCodes.Status400BadRequest)]
    [TestCase(StatusCodes.Status409Conflict)]
    public async Task UpsertCurrent_WhenAuthenticated_ShouldDispatchCommandAndPropagateStatusCode(int statusCode)
    {
        // Cenário: Chamada a PUT /current com usuário autenticado e diferentes status retornados pelo serviço.
        // Objetivo: Garantir despacho de UpsertUserKinkChecklistCommand e propagação fiel do StatusCode HTTP.
        SetAuthenticatedUser(42);
        var request = new UpsertUserKinkChecklistRequestDto("1.0.0", "pt-BR", "{}", DateTime.UtcNow, 1);

        var serviceResponse = statusCode == StatusCodes.Status200OK
            ? ServiceResponse<UserKinkChecklistDto>.Ok(
                new UserKinkChecklistDto(1, "1.0.0", "pt-BR", "{}", DateTime.UtcNow, 2, DateTime.UtcNow, DateTime.UtcNow),
                "Checklist saved online successfully.",
                ChecklistMessageKeys.ChecklistSaved)
            : ServiceResponse<UserKinkChecklistDto>.Fail(ChecklistMessageKeys.ChecklistVersionConflict, statusCode);

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<UpsertUserKinkChecklistCommand>(c => c.UserKinkId == 42 && c.Request == request),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.UpsertCurrent(request, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(statusCode);
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task DeleteCurrent_WhenAuthenticated_ShouldDispatchCommandAndReturn200()
    {
        // Cenário: Usuário autenticado solicita exclusão do checklist salvo on-line.
        // Objetivo: Despachar DeleteCurrentUserKinkChecklistCommand e retornar HTTP 200 com true.
        SetAuthenticatedUser(42);
        var response = ServiceResponse<bool>.Ok(
            true,
            "Saved checklist removed successfully.",
            ChecklistMessageKeys.ChecklistDeleted);

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<DeleteCurrentUserKinkChecklistCommand>(c => c.UserKinkId == 42),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var actionResult = await _controller.DeleteCurrent(CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<bool>>().Subject;
        payload.Success.Should().BeTrue();
        payload.Data.Should().BeTrue();
        _dispatcherMock.VerifyAll();
    }

    private void SetAuthenticatedUser(long userId)
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, userId.ToString())],
            "Bearer");
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
    }
}
