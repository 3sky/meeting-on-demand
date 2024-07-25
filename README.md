# Jitsi on demand

For quite a long time I was looking for a solution
that would allow me to schedule meetings with friends, family,
and clients. Most of them are paid every month.
Which is not a very cost-effective solution, if I have one meeting per month,
sometimes two.
Also let's assume, that being an AI learning material for Google, or Zoom
isn't my dream position.

Suddenly, I realized that I could use [Jitsi](https://meet.jit.si/),
and then self-host it. The problem was that I was looking for an on-demand solution.
So I took the official [docker image](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/), and
rewritten it into ECS, which just works.

## How it works?

Or what do you need? The assumption is that you have:

1. Registred domain with Route53.
1. Some ideas about AWS.
1. Access to manage needed solutions.
1. Installed AWS CDK.

When you need:

1. Adjust the `src/main.ts` file.

```typescript
const devEnv = {
  account: '471112990549', // put your account ID here
  region: 'eu-central-1', // put your region here
};

const DOMAIN_NAME: string = '3sky.in'; // adjust your domain name
const JITSI_IMAGE_VERSION: string = 'stable-9584-1'; // specify jitsi version
```

1. Execute `cdk deploy --all` in the project root directory.

## Topic to consider

1. Images are hosted on `quay.io`, not on `dockerhub.io` due rate limit.
1. The solution could be built inside existing VPC, which will be faster.
1. However, setting up existing project is rather fast.

```bash
cdk deploy --all --require-approval never  10.90s user 1.22s system 3% cpu 6:38.00 total
```
