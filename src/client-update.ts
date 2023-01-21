import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as cr from "aws-cdk-lib/custom-resources"
import { Construct } from "constructs"

interface ClientUpdateProps {
  oauthScopes: string[]
  client: cognito.IUserPoolClient
  userPool: cognito.IUserPool
  callbackUrl?: string
  callbackUrls?: string[]
  signOutUrl?: string
  signOutUrls?: string[]
  identityProviders: string[]
}

export class ClientUpdate extends Construct {
  constructor(scope: Construct, id: string, props: ClientUpdateProps) {
    super(scope, id)

    if (!props.signOutUrl && !props.signOutUrls) {
      throw new Error("You must pass in either signOutUrl or signOutUrls")
    }
    if (!props.callbackUrl && !props.callbackUrls) {
      throw new Error("You must pass in either callbackUrl or callbackUrls")
    }

    let signOutUrls = props.signOutUrls || []
    let callbackUrls = props.callbackUrls || []

    if (props.signOutUrl) {
      signOutUrls.push(props.signOutUrl)
      signOutUrls = [...new Set(signOutUrls)]
    }
    if (props.callbackUrl) {
      callbackUrls.push(props.callbackUrl)
      callbackUrls = [...new Set(callbackUrls)]
    }

    new cr.AwsCustomResource(this, "Resource", {
      onUpdate: {
        service: "CognitoIdentityServiceProvider",
        action: "updateUserPoolClient",
        parameters: {
          AllowedOAuthFlows: ["code"],
          AllowedOAuthFlowsUserPoolClient: true,
          SupportedIdentityProviders: props.identityProviders,
          AllowedOAuthScopes: props.oauthScopes,
          ClientId: props.client.userPoolClientId,
          CallbackURLs: callbackUrls,
          LogoutURLs: signOutUrls,
          UserPoolId: props.userPool.userPoolId,
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          `${props.userPool.userPoolId}-${props.client.userPoolClientId}`,
        ),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["cognito-idp:UpdateUserPoolClient"],
          resources: [props.userPool.userPoolArn],
        }),
      ]),
    })
  }
}
