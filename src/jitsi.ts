import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export interface JitsiStackProps extends cdk.StackProps {
  sg: ec2.SecurityGroup;
  listener: elbv2.ApplicationListener;
  ecsCluster: ecs.Cluster;
  namespace: servicediscovery.PrivateDnsNamespace;
  JITSI_IMAGE_VERSION: string;
}

export class JitsiStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: JitsiStackProps) {
    super(scope, id, props);

    const theSG = props.sg;
    const theListner = props.listener;
    const theCluster = props.ecsCluster;
    const theNamespace = props.namespace;
    const IMAGE_VERSION = props.JITSI_IMAGE_VERSION;

    cdk.Tags.of(this).add('description', 'Jitsi Demo');
    cdk.Tags.of(this).add('organization', '3sky.dev');
    cdk.Tags.of(this).add('owner', '3sky');

    let JICOFO_AUTH_PASSWORD: string = '2dAZl8Jkeg5cKT/rbJDZcslGCWt1cA3NnF4QqkFFATY=';
    let JVB_AUTH_PASSWORD: string = 'Tph1fJEdU6lFY8aTNPz4EpI5iewQXl+Ot17IeGCmvBs=';
    let JIBRI_RECORDER_PASSWORD: string = 'be09C+kfqvgNVtLrBKbBb3eh3GEzpMvpCzfhd06y9Ts=';
    let JIBRI_XMPP_PASSWORD: string = '8aabw76O1ufx9X2Tw19jw7dqYz5ipM9l8ZqfIdQSczk=';
    let JIGASI_XMPP_PASSWORD: string = 'ccUAboP4rokc/68AGaimxzmjhtbk0lyByqHVaHc6GGk=';


    const ecsTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 8192,
      cpu: 4096,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },

    });

    ecsTaskDefinition.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry('jitsi/web:' + IMAGE_VERSION),
      environment: {
        TZ: 'Europe/Warsaw',
        PUBLIC_URL: 'https://meet.3sky.in',
      },
      portMappings: [
        {
          containerPort: 80,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: 443,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: new ecs.AwsLogDriver({ streamPrefix: this.stackName + '-web' }),
    });

    ecsTaskDefinition.addContainer('jicofo', {
      image: ecs.ContainerImage.fromRegistry('jitsi/jicofo:' + IMAGE_VERSION),
      environment: {
        TZ: 'Europe/Warsaw',
        JICOFO_AUTH_PASSWORD: JICOFO_AUTH_PASSWORD,
        SENTRY_DSN: '0',

      },
      portMappings: [
        {
          containerPort: 8888,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: new ecs.AwsLogDriver({ streamPrefix: this.stackName + '-jicofo' }),
    });

    ecsTaskDefinition.addContainer('jvb', {
      image: ecs.ContainerImage.fromRegistry('jitsi/jvb:' + IMAGE_VERSION),
      environment: {
        TZ: 'Europe/Warsaw',
        JVB_AUTH_PASSWORD: JVB_AUTH_PASSWORD,
        SENTRY_DSN: '0',
      },
      portMappings: [
        {
          containerPort: 10000,
          protocol: ecs.Protocol.UDP,
        },
        {
          containerPort: 8080,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: new ecs.AwsLogDriver({ streamPrefix: this.stackName + '-jvb' }),
    });

    const prosody = ecsTaskDefinition.addContainer('prosody', {
      image: ecs.ContainerImage.fromRegistry('jitsi/prosody:' + IMAGE_VERSION),
      environment: {
        TZ: 'Europe/Warsaw',
        JIBRI_RECORDER_PASSWORD: JIBRI_RECORDER_PASSWORD,
        JIBRI_XMPP_PASSWORD: JIBRI_XMPP_PASSWORD,
        JICOFO_AUTH_PASSWORD: JICOFO_AUTH_PASSWORD,
        JIGASI_XMPP_PASSWORD: JIGASI_XMPP_PASSWORD,
        JVB_AUTH_PASSWORD: JVB_AUTH_PASSWORD,
      },
      portMappings: [
        {
          containerPort: 5222,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: 5269,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: 5347,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: 5280,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: new ecs.AwsLogDriver({ streamPrefix: this.stackName + '-prosody' }),
    });

    const ecsService = new ecs.FargateService(this, 'EcsService', {
      cluster: theCluster,
      taskDefinition: ecsTaskDefinition,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [
        theSG,
      ],
      cloudMapOptions: {
        name: 'xmpp',
        container: prosody,
        cloudMapNamespace: theNamespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    theListner.addTargets('ECS', {
      port: 443,
      targets: [ecsService],
      healthCheck: {
        port: '80',
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: '200',
      },
    });
  }
}
