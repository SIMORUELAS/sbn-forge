'use strict';

const aiAgentMetrics =
  require(
    '../output/modules/ai-agent-metrics/ai-agent-metrics.routes'
  );

const aiAgentModuleScope =
  require(
    '../output/modules/ai-agent-module-scope/ai-agent-module-scope.routes'
  );

const aiAgentRoleAssignments =
  require(
    '../output/modules/ai-agent-role-assignments/ai-agent-role-assignments.routes'
  );

const aiAgentRoles =
  require(
    '../output/modules/ai-agent-roles/ai-agent-roles.routes'
  );

const aiAgents =
  require(
    '../output/modules/ai-agents/ai-agents.routes'
  );

const aiArtifactReleases =
  require(
    '../output/modules/ai-artifact-releases/ai-artifact-releases.routes'
  );

const aiArtifacts =
  require(
    '../output/modules/ai-artifacts/ai-artifacts.routes'
  );

const aiBusinessEvents =
  require(
    '../output/modules/ai-business-events/ai-business-events.routes'
  );

const aiBusinessModelComponentDependencies =
  require(
    '../output/modules/ai-business-model-component-dependencies/ai-business-model-component-dependencies.routes'
  );

const aiBusinessModelContractTemplates =
  require(
    '../output/modules/ai-business-model-contract-templates/ai-business-model-contract-templates.routes'
  );

const aiBusinessModelDepartments =
  require(
    '../output/modules/ai-business-model-departments/ai-business-model-departments.routes'
  );

const aiBusinessModelDeploymentItems =
  require(
    '../output/modules/ai-business-model-deployment-items/ai-business-model-deployment-items.routes'
  );

const aiBusinessModelDeploymentOverrides =
  require(
    '../output/modules/ai-business-model-deployment-overrides/ai-business-model-deployment-overrides.routes'
  );

const aiBusinessModelDeploymentSyncPolicies =
  require(
    '../output/modules/ai-business-model-deployment-sync-policies/ai-business-model-deployment-sync-policies.routes'
  );

const aiBusinessModelDeployments =
  require(
    '../output/modules/ai-business-model-deployments/ai-business-model-deployments.routes'
  );

const aiBusinessModelInstallationSteps =
  require(
    '../output/modules/ai-business-model-installation-steps/ai-business-model-installation-steps.routes'
  );

const aiBusinessModelInstallations =
  require(
    '../output/modules/ai-business-model-installations/ai-business-model-installations.routes'
  );

const aiBusinessModelReleaseItems =
  require(
    '../output/modules/ai-business-model-release-items/ai-business-model-release-items.routes'
  );

const aiBusinessModelReleases =
  require(
    '../output/modules/ai-business-model-releases/ai-business-model-releases.routes'
  );

const aiBusinessModelTeams =
  require(
    '../output/modules/ai-business-model-teams/ai-business-model-teams.routes'
  );

const aiBusinessModelUpdateItems =
  require(
    '../output/modules/ai-business-model-update-items/ai-business-model-update-items.routes'
  );

const aiBusinessModelUpdateRuns =
  require(
    '../output/modules/ai-business-model-update-runs/ai-business-model-update-runs.routes'
  );

const aiBusinessModels =
  require(
    '../output/modules/ai-business-models/ai-business-models.routes'
  );

const aiBusinessTeamAgents =
  require(
    '../output/modules/ai-business-team-agents/ai-business-team-agents.routes'
  );

const aiBusinessTeams =
  require(
    '../output/modules/ai-business-teams/ai-business-teams.routes'
  );

const aiCenterDepartments =
  require(
    '../output/modules/ai-center-departments/ai-center-departments.routes'
  );

const aiCenterMetrics =
  require(
    '../output/modules/ai-center-metrics/ai-center-metrics.routes'
  );

const aiContextAssets =
  require(
    '../output/modules/ai-context-assets/ai-context-assets.routes'
  );

const aiDecisionOutcomes =
  require(
    '../output/modules/ai-decision-outcomes/ai-decision-outcomes.routes'
  );

const aiDepartmentTeams =
  require(
    '../output/modules/ai-department-teams/ai-department-teams.routes'
  );

const aiEventActions =
  require(
    '../output/modules/ai-event-actions/ai-event-actions.routes'
  );

const aiEventDeadLetters =
  require(
    '../output/modules/ai-event-dead-letters/ai-event-dead-letters.routes'
  );

const aiEventDefinitions =
  require(
    '../output/modules/ai-event-definitions/ai-event-definitions.routes'
  );

const aiEventDispatches =
  require(
    '../output/modules/ai-event-dispatches/ai-event-dispatches.routes'
  );

const aiEventHistory =
  require(
    '../output/modules/ai-event-history/ai-event-history.routes'
  );

const aiEventMetrics =
  require(
    '../output/modules/ai-event-metrics/ai-event-metrics.routes'
  );

const aiEventOutbox =
  require(
    '../output/modules/ai-event-outbox/ai-event-outbox.routes'
  );

const aiEventSubscriptions =
  require(
    '../output/modules/ai-event-subscriptions/ai-event-subscriptions.routes'
  );

const aiExecutionHandoffs =
  require(
    '../output/modules/ai-execution-handoffs/ai-execution-handoffs.routes'
  );

const aiExecutionLogs =
  require(
    '../output/modules/ai-execution-logs/ai-execution-logs.routes'
  );

const aiIntelligenceContractApis =
  require(
    '../output/modules/ai-intelligence-contract-apis/ai-intelligence-contract-apis.routes'
  );

const aiIntelligenceContractCapabilities =
  require(
    '../output/modules/ai-intelligence-contract-capabilities/ai-intelligence-contract-capabilities.routes'
  );

const aiIntelligenceContractCollaborators =
  require(
    '../output/modules/ai-intelligence-contract-collaborators/ai-intelligence-contract-collaborators.routes'
  );

const aiIntelligenceContractEvents =
  require(
    '../output/modules/ai-intelligence-contract-events/ai-intelligence-contract-events.routes'
  );

const aiIntelligenceContractKpis =
  require(
    '../output/modules/ai-intelligence-contract-kpis/ai-intelligence-contract-kpis.routes'
  );

const aiIntelligenceContractMemoryRules =
  require(
    '../output/modules/ai-intelligence-contract-memory-rules/ai-intelligence-contract-memory-rules.routes'
  );

const aiIntelligenceContractResponseSections =
  require(
    '../output/modules/ai-intelligence-contract-response-sections/ai-intelligence-contract-response-sections.routes'
  );

const aiIntelligenceContractRestrictions =
  require(
    '../output/modules/ai-intelligence-contract-restrictions/ai-intelligence-contract-restrictions.routes'
  );

const aiIntelligenceContractTools =
  require(
    '../output/modules/ai-intelligence-contract-tools/ai-intelligence-contract-tools.routes'
  );

const aiIntelligenceContracts =
  require(
    '../output/modules/ai-intelligence-contracts/ai-intelligence-contracts.routes'
  );

const aiIntelligentCenters =
  require(
    '../output/modules/ai-intelligent-centers/ai-intelligent-centers.routes'
  );

const aiIntelligentDepartments =
  require(
    '../output/modules/ai-intelligent-departments/ai-intelligent-departments.routes'
  );

const aiIntelligentOrganizations =
  require(
    '../output/modules/ai-intelligent-organizations/ai-intelligent-organizations.routes'
  );

const aiLearningObservations =
  require(
    '../output/modules/ai-learning-observations/ai-learning-observations.routes'
  );

const aiOptimizationActions =
  require(
    '../output/modules/ai-optimization-actions/ai-optimization-actions.routes'
  );

const aiOptimizationRecommendations =
  require(
    '../output/modules/ai-optimization-recommendations/ai-optimization-recommendations.routes'
  );

const aiOrganizationCenters =
  require(
    '../output/modules/ai-organization-centers/ai-organization-centers.routes'
  );

const aiOrganizationDepartments =
  require(
    '../output/modules/ai-organization-departments/ai-organization-departments.routes'
  );

const aiOrganizationIntelligenceMetrics =
  require(
    '../output/modules/ai-organization-intelligence-metrics/ai-organization-intelligence-metrics.routes'
  );

const aiPromptTemplates =
  require(
    '../output/modules/ai-prompt-templates/ai-prompt-templates.routes'
  );

const aiResponseCache =
  require(
    '../output/modules/ai-response-cache/ai-response-cache.routes'
  );

const aiReviews =
  require(
    '../output/modules/ai-reviews/ai-reviews.routes'
  );

async function registerForgeRoutes(
  fastify
) {
  await fastify.register(
    aiAgentMetrics
  );

  await fastify.register(
    aiAgentModuleScope
  );

  await fastify.register(
    aiAgentRoleAssignments
  );

  await fastify.register(
    aiAgentRoles
  );

  await fastify.register(
    aiAgents
  );

  await fastify.register(
    aiArtifactReleases
  );

  await fastify.register(
    aiArtifacts
  );

  await fastify.register(
    aiBusinessEvents
  );

  await fastify.register(
    aiBusinessModelComponentDependencies
  );

  await fastify.register(
    aiBusinessModelContractTemplates
  );

  await fastify.register(
    aiBusinessModelDepartments
  );

  await fastify.register(
    aiBusinessModelDeploymentItems
  );

  await fastify.register(
    aiBusinessModelDeploymentOverrides
  );

  await fastify.register(
    aiBusinessModelDeploymentSyncPolicies
  );

  await fastify.register(
    aiBusinessModelDeployments
  );

  await fastify.register(
    aiBusinessModelInstallationSteps
  );

  await fastify.register(
    aiBusinessModelInstallations
  );

  await fastify.register(
    aiBusinessModelReleaseItems
  );

  await fastify.register(
    aiBusinessModelReleases
  );

  await fastify.register(
    aiBusinessModelTeams
  );

  await fastify.register(
    aiBusinessModelUpdateItems
  );

  await fastify.register(
    aiBusinessModelUpdateRuns
  );

  await fastify.register(
    aiBusinessModels
  );

  await fastify.register(
    aiBusinessTeamAgents
  );

  await fastify.register(
    aiBusinessTeams
  );

  await fastify.register(
    aiCenterDepartments
  );

  await fastify.register(
    aiCenterMetrics
  );

  await fastify.register(
    aiContextAssets
  );

  await fastify.register(
    aiDecisionOutcomes
  );

  await fastify.register(
    aiDepartmentTeams
  );

  await fastify.register(
    aiEventActions
  );

  await fastify.register(
    aiEventDeadLetters
  );

  await fastify.register(
    aiEventDefinitions
  );

  await fastify.register(
    aiEventDispatches
  );

  await fastify.register(
    aiEventHistory
  );

  await fastify.register(
    aiEventMetrics
  );

  await fastify.register(
    aiEventOutbox
  );

  await fastify.register(
    aiEventSubscriptions
  );

  await fastify.register(
    aiExecutionHandoffs
  );

  await fastify.register(
    aiExecutionLogs
  );

  await fastify.register(
    aiIntelligenceContractApis
  );

  await fastify.register(
    aiIntelligenceContractCapabilities
  );

  await fastify.register(
    aiIntelligenceContractCollaborators
  );

  await fastify.register(
    aiIntelligenceContractEvents
  );

  await fastify.register(
    aiIntelligenceContractKpis
  );

  await fastify.register(
    aiIntelligenceContractMemoryRules
  );

  await fastify.register(
    aiIntelligenceContractResponseSections
  );

  await fastify.register(
    aiIntelligenceContractRestrictions
  );

  await fastify.register(
    aiIntelligenceContractTools
  );

  await fastify.register(
    aiIntelligenceContracts
  );

  await fastify.register(
    aiIntelligentCenters
  );

  await fastify.register(
    aiIntelligentDepartments
  );

  await fastify.register(
    aiIntelligentOrganizations
  );

  await fastify.register(
    aiLearningObservations
  );

  await fastify.register(
    aiOptimizationActions
  );

  await fastify.register(
    aiOptimizationRecommendations
  );

  await fastify.register(
    aiOrganizationCenters
  );

  await fastify.register(
    aiOrganizationDepartments
  );

  await fastify.register(
    aiOrganizationIntelligenceMetrics
  );

  await fastify.register(
    aiPromptTemplates
  );

  await fastify.register(
    aiResponseCache
  );

  await fastify.register(
    aiReviews
  );

}

module.exports =
  registerForgeRoutes;
