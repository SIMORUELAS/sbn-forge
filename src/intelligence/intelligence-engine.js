'use strict';

const FeatureDetector = require('./feature-detector');
const BehaviorResolver = require('./behavior-resolver');
const RecommendationEngine = require(
  './recommendation-engine'
);

class IntelligenceEngine {
  constructor(dependencies = {}) {
    this.featureDetector =
      dependencies.featureDetector ||
      new FeatureDetector();

    this.behaviorResolver =
      dependencies.behaviorResolver ||
      new BehaviorResolver();

    this.recommendationEngine =
      dependencies.recommendationEngine ||
      new RecommendationEngine();
  }

  analyze(context) {
    if (!context || typeof context !== 'object') {
      throw new TypeError(
        'IntelligenceEngine requiere un Generator Context'
      );
    }

    const features =
      this.featureDetector.detect(context);

    const behaviors =
      this.behaviorResolver.resolve(features);

    const recommendations =
      this.recommendationEngine.recommend(
        context,
        features,
        behaviors
      );

    return {
      ...context,

      intelligence: {
        engineVersion: '1.0.0',
        analyzedAt: new Date().toISOString(),

        features,

        behaviors,

        recommendations,

        summary: {
          detectedFeatures:
            this.countEnabledFeatures(features),

          enabledBehaviors:
            this.countEnabledBehaviors(behaviors),

          recommendationCount:
            recommendations.length
        }
      }
    };
  }

  countEnabledFeatures(features) {
    return Object.values(features).filter(
      (value) =>
        value === true ||
        (Array.isArray(value) && value.length > 0)
    ).length;
  }

  countEnabledBehaviors(behaviors) {
    return Object.values(behaviors).filter(
      (behavior) => behavior.enabled === true
    ).length;
  }
}

module.exports = IntelligenceEngine;