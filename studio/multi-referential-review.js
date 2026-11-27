'use strict';
const crypto = require('node:crypto');
const { validateMultiDefinition } = require('./multi-definition-store');
const { verifyMultiReferentialEvidence } = require('./multi-referential-verifier');
const { createMultiEngineBridge } = require('./multi-engine-bridge');

async function createMultiReferentialReview(input, reader) {
  const definition = validateMultiDefinition(input);
  const definitionHash = crypto.createHash('sha256').update(JSON.stringify(definition)).digest('hex');
  const bridge = createMultiEngineBridge(definition);
  const verification = await verifyMultiReferentialEvidence(definition, reader);
  const resources = bridge.resources.map(resource => ({
    table: resource.table,
    relations: resource.compositeRelations.map(relation => ({
      name: relation.name, targetSchema: relation.targetSchema, targetTable: relation.targetTable,
      columns: relation.columns,
      verification: verification.results.find(result =>
        result.fromTable === resource.table && result.name === relation.name) || null,
      executable: false
    }))
  }));
  const expected = definition.foreignKeyGroups.filter(group => group.columns.length > 1);
  const reviewed = resources.flatMap(resource => resource.relations.map(relation =>
    ({ ...relation, fromTable: resource.table })));
  const complete = expected.length === reviewed.length && expected.every(group =>
    reviewed.some(relation => relation.fromTable === group.fromTable &&
      relation.name === group.name && relation.targetTable === group.toTable &&
      relation.targetSchema === definition.source.schema &&
      JSON.stringify(relation.columns) === JSON.stringify(group.columns) &&
      relation.verification?.status === 'catalog-match'));
  const evidenceHash = crypto.createHash('sha256').update(JSON.stringify({
    definitionHash, resources, verification
  })).digest('hex');
  return { kind: 'studio.multitable.referential-review', version: 1,
    source: definition.source, definitionHash, evidenceHash, resources, verification,
    compositeReviewComplete: expected.length > 0 && complete,
    certified: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false };
}
module.exports = { createMultiReferentialReview };
