import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface DatabaseProps {
  network: {
    vpc: ec2.IVpc;
    subnetGroup: rds.SubnetGroup;
  };
}

export class Database extends Construct {
  public readonly instance: rds.DatabaseInstance
  public readonly databaseSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.network.vpc,
      description: 'Used by RDS',
      allowAllOutbound: true,
      disableInlineRules: true
    });

    this.instance = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      databaseName: "finance",
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      vpc: props.network.vpc,
      securityGroups: [this.databaseSecurityGroup],
      subnetGroup: props.network.subnetGroup,
      storageEncrypted: true,
      caCertificate: rds.CaCertificate.RDS_CA_RDS2048_G1
    });
  }
}
