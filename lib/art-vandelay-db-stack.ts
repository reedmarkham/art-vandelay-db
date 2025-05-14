import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class ArtVandelayDbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Secrets Manager secret for OpenSearch main user
    const opensearchSecret = new secretsmanager.Secret(this, 'OpenSearchMainUserSecret', {
      secretName: 'art-vandelay-opensearch-main-user',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    // Create the OpenSearch Service domain with vector search enabled
    const domain = new opensearch.Domain(this, 'ArtVandelayOpenSearch', {
      version: opensearch.EngineVersion.OPENSEARCH_1_1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      capacity: {
        dataNodeInstanceType: 't3.small.search',
        dataNodes: 1,
      },
      ebs: {
        volumeSize: 10,
        volumeType: cdk.aws_ec2.EbsDeviceVolumeType.GP2,
      },
      nodeToNodeEncryption: true,
      encryptionAtRest: { enabled: true },
      enforceHttps: true,
      fineGrainedAccessControl: {
        masterUserName: opensearchSecret.secretValueFromJson('username').toString(),
        masterUserPassword: opensearchSecret.secretValueFromJson('password'),
      },
      accessPolicies: [
        new cdk.aws_iam.PolicyStatement({
          actions: ['es:*'],
          effect: cdk.aws_iam.Effect.ALLOW,
          principals: [new cdk.aws_iam.AnyPrincipal()],
          resources: ['*'],
        }),
      ],
      zoneAwareness: { enabled: false },
    });

    // Output the domain endpoint
    new cdk.CfnOutput(this, 'OpenSearchDomainEndpoint', {
      value: domain.domainEndpoint,
    });
  }
}
