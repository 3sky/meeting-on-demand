import * as cdk from 'aws-cdk-lib';
import * as acme from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export class BaseStack extends cdk.Stack {
  public readonly privateSecurityGroup: ec2.SecurityGroup;
  public readonly listener: elbv2.ApplicationListener;
  public readonly ecsCluster: ecs.Cluster;
  public readonly namespace: servicediscovery.PrivateDnsNamespace;


  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('description', 'Temporary Jitsi');
    cdk.Tags.of(this).add('organization', '3sky.dev');
    cdk.Tags.of(this).add('owner', '3sky');


    let DOMAIN_NAME: string = '3sky.in';

    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.192.0.0/20'),
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      restrictDefaultSecurityGroup: true,
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 28,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc: vpc,
      description: 'Allow HTTPS traffic to ALB',
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTP traffic from anywhere');

    this.privateSecurityGroup = new ec2.SecurityGroup(this, 'PrivateSG', {
      vpc: vpc,
      description: 'Allow access from private network',
      allowAllOutbound: true,
    });

    this.privateSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(80), 'Allow traffic for health checks');

    this.privateSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(443), 'Allow traffic for health checks');

    const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLB', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: DOMAIN_NAME });

    this.namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', {
      name: 'meet.jitsi',
      vpc,
    });
    new route53.CnameRecord(this, 'cnameForAlb', {
      recordName: 'meet',
      zone: zone,
      domainName: alb.loadBalancerDnsName,
      ttl: cdk.Duration.minutes(1),
    });

    const albcert = new acme.Certificate(this, 'Certificate', {
      domainName: 'meet.' + DOMAIN_NAME,
      certificateName: 'Temporary Jitsi service', // Optionally provide an certificate name
      validation: acme.CertificateValidation.fromDns(zone),
    });

    this.listener = alb.addListener('Listener', {
      port: 443,
      open: true,
      certificates: [albcert],
    });

    this.ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: 'jitsi-ecs-cluster',
      containerInsights: true,
      enableFargateCapacityProviders: true,
      vpc: vpc,
    });
  }
}
