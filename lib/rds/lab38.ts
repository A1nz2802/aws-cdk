import { Stack, StackProps } from 'aws-cdk-lib';
import { CfnSubnetGroup } from 'aws-cdk-lib/aws-dax';
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CfnReplicationGroup } from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export class Lab38 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Create ElastiCache Cluster';

    const vpc = Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    const elasticacheSg = new SecurityGroup(this, 'ElastiCacheSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis cluster',
    });

    elasticacheSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(6379),
      'Allow Redis traffic from anywhere (Not for Production)',
    );

    const subnetGroup = new CfnSubnetGroup(this, 'ElastiCacheSubnetGroup', {
      description: 'Subnet group for ElastiCache',
      subnetIds: vpc.publicSubnets.map(subnet => subnet.subnetId),
    });

    new CfnReplicationGroup(this, 'MyRedisReplicationGroup', {
      replicationGroupDescription: 'My Redis cluster with replicas',
      engine: 'redis',
      engineVersion: '7.1',
      port: 6379,
      cacheParameterGroupName: 'default.redis7',
      cacheNodeType: 'cache.r7g.large',
      numNodeGroups: 1,
      replicasPerNodeGroup: 2,
      multiAzEnabled: true,
      cacheSubnetGroupName: subnetGroup.ref,
      securityGroupIds: [elasticacheSg.securityGroupId],
      autoMinorVersionUpgrade: true,
    });
  }
}
