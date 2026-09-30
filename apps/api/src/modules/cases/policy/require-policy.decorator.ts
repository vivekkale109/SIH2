import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { PolicyAction, POLICY_ACTION_KEY } from './policy.types';

export const RequirePolicy = (action: PolicyAction): CustomDecorator<string> =>
  SetMetadata(POLICY_ACTION_KEY, action);
