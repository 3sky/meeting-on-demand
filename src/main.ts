import { App } from 'aws-cdk-lib';
import { BaseStack } from './base';
import { JitsiStack } from './jitsi';

const devEnv = {
  account: '471112990549',
  region: 'eu-central-1',
};

const app = new App();
const base = new BaseStack(app, 'jitsi-base', {
  env: devEnv,
  stackName: 'jitsi-base',
});

new JitsiStack(app, 'jitsi',
  {
    env: devEnv,
    stackName: 'temporary-jitsi',
    sg: base.privateSecurityGroup,
    listener: base.listener,
    ecsCluster: base.ecsCluster,
    namespace: base.namespace,
    // image versions
    JITSI_IMAGE_VERSION: 'stable-9584-1',
  },

);


app.synth();
