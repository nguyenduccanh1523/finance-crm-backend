import { SetMetadata } from '@nestjs/common';
import { FeatureCode } from '../features/feature-codes';

export const REQUIRE_FEATURES_KEY = 'require_features';
export const RequireFeatures = (...features: FeatureCode[]) =>
  SetMetadata(REQUIRE_FEATURES_KEY, features);
