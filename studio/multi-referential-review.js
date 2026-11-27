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
  return { kind: 'studio.multitable.referential-review', version: 1,
    source: definition.source, definitionHash, resources, verification,
    certified: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false };
}
module.exports = { createMultiReferentialReview };
