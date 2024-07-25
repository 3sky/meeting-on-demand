import { App } from 'aws-cdk-lib';
import { BaseStack } from './base';
import { JitsiStack } from './jitsi';

const devEnv = {
  account: '471112990549',
  region: 'eu-central-1',
};

const app = new App();
const base = new BaseStack(app, 'jitsi-baseline', {
  env: devEnv,
  stackName: 'jitsi-baseline',
});

new JitsiStack(app, 'jitsi-instance',
  {
    env: devEnv,
    stackName: 'jitsi-instnace',
    sg: base.privateSecurityGroup,
    listener: base.listener,
    ecsCluster: base.ecsCluster,
    namespace: base.namespace,
    // image versions
    JITSI_IMAGE_VERSION: 'stable-9584-1',
  },

);


app.synth();
