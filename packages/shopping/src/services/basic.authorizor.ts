import {
  AuthorizationContext,
  AuthorizationMetadata,
  AuthorizationDecision,
  AuthorizationRequest,
} from '@loopback/authorization';
import _ from 'lodash';
import {UserProfile, securityId} from '@loopback/security';

interface MyAuthorizationMetadata extends AuthorizationMetadata {
  currentUser?: UserProfile;
  decision?: AuthorizationDecision;
}

// Instance level authorizer
// Can be also registered as an authorizer, depends on users' need.
export async function basicAuthorization(
  authorizationCtx: AuthorizationContext,
  metadata: MyAuthorizationMetadata,
) {

  // No access if authorization details are missing
  let currentUser: UserProfile;
  if (authorizationCtx.principals.length > 0) {
    const user = _.pick(authorizationCtx.principals[0], [
      'id',
      'name',
      'roles',
    ]);
    currentUser = {[securityId]: user.id, name: user.name, roles: user.roles};
  } else {
    return AuthorizationDecision.DENY;
  }

  const request: AuthorizationRequest = {
    subject: currentUser[securityId],
    object: metadata.resource ?? authorizationCtx.resource,
    action: (metadata.scopes && metadata.scopes[0]) || 'execute',
  };

  // Admin can access everything
  if (currentUser.roles.includes('admin')) {
    return AuthorizationDecision.ALLOW;
  }

  // Customer support can acces some aspects of customer's models
  if (currentUser.roles.includes('support') && request.action === 'find') {
    return AuthorizationDecision.ALLOW;
  }

  // Allow access only to model owners
  if (currentUser[securityId] === authorizationCtx.invocationContext.args[0]) {
    return AuthorizationDecision.ALLOW;
  }

  return AuthorizationDecision.DENY;
}
