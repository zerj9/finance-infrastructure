import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Network } from './network'
import { Database } from './database'
import { Instance } from './ec2'

export class FinanceInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const breadmanagerHostedZone = route53.PublicHostedZone.fromPublicHostedZoneAttributes(
      this, 'BreadManagerHostedZone', {
        hostedZoneId: 'Z0193474KXYSB0F637HC',
        zoneName: 'breadmanager.com'
      }
    );

    const appBucket = new s3.Bucket(this, 'AppBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const appBucketNameParam = new ssm.StringParameter(this, 'AppBucketNameParam', {
      stringValue: appBucket.bucketName,
    });

    const network = new Network(this, 'Network', 
      {
        cidr: '10.0.0.0/16',
        hostedZones: [breadmanagerHostedZone]
      }
    )

    const database = new Database(this, 'Database', {
      network: {
        vpc: network.vpc,
        subnetGroup: network.subnetGroup
      }
    })

    const instance = new Instance(this, 'Service', {
      network: {
        vpc: network.vpc
      }
    })

    // Allow EC2 to connect to Postgres
    database.databaseSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(instance.instanceSecurityGroup.securityGroupId),
      ec2.Port.POSTGRES,
      "EC2 to Postgres"
    )

    // Allow EC2 to get secret/param containing Postgres details and S3 bucket
    database.instance.secret!.grantRead(instance.instanceRole)
    appBucket.grantRead(instance.instanceRole)
    appBucketNameParam.grantRead(instance.instanceRole)

    instance.addUserData(`
      #!/bin/bash
      dnf update -y
      dnf install git docker -y
      systemctl start docker
      systemctl enable docker
      usermod -aG docker ssm-user

      mkdir -p /usr/local/lib/docker/cli-plugins
      curl -L "https://github.com/docker/compose/releases/download/v2.29.1/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
      chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
      curl -LsSf https://astral.sh/uv/install.sh | sh
      source $HOME/.cargo/env

      BUCKET_NAME=$(aws ssm get-parameter --name ${appBucketNameParam.parameterName} --query Parameter.Value --output text)
    `);
  }
}
