import { App, Tags } from 'aws-cdk-lib';
import { BaseStack } from './base';
import { JitsiStack } from './jitsi';

const devEnv = {
  account: '471112990549',
  region: 'eu-central-1',
};

const DOMAIN_NAME: string = '3sky.in';
const JITSI_IMAGE_VERSION: string = 'stable-9584-1';

const app = new App();
const base = new BaseStack(app, 'jitsi-baseline', {
  env: devEnv,
  stackName: 'jitsi-baseline',
  domainName: DOMAIN_NAME,
});

new JitsiStack(app, 'jitsi-instance',
  {
    env: devEnv,
    stackName: 'jitsi-instance',
    sg: base.privateSecurityGroup,
    listener: base.listener,
    ecsCluster: base.ecsCluster,
    namespace: base.namespace,
    domainName: DOMAIN_NAME,
    // image versions
    jitsiImageVersion: JITSI_IMAGE_VERSION,
  },

);


Tags.of(app).add('description', 'Jitsi Temporary Instance');
app.synth();
