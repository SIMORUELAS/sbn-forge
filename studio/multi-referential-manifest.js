'use strict';
const crypto = require('node:crypto');
const { createMultiReferentialReview } = require('./multi-referential-review');

async function createMultiReferentialManifest(input, reader) {
  const review = await createMultiReferentialReview(input, reader);
  const payload = {
    kind: 'studio.multitable.referential-manifest', version: 1,
    mode: 'review-only', source: review.source,
    definitionHash: review.definitionHash, evidenceHash: review.evidenceHash,
    compositeReviewComplete: review.compositeReviewComplete,
    resources: review.resources, verification: review.verification,
    certified: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false
  };
  return { ...payload, manifestHash: crypto.createHash('sha256')
    .update(JSON.stringify(payload)).digest('hex') };
}
module.exports = { createMultiReferentialManifest };
