# Tarjonta-pulssi, powered by SST and Remix

Infrastructure of this project is deployed using SST, which is providing higher level constructs for CDK.

## Working with SST

The infrastructure stacks are defined in /stacks and the stacks are initialized in `sst.config.ts` - file. The available stages are hardcoded into the infrastructure stack.

Suggested way of working with SST:

First time setup, run

```sh
pnpm install
```

Install and configure aws-vault https://github.com/99designs/aws-vault (you can skip this step, but you will be asked for MFA every time you perform `pnpm exec sst deploy` for example)

Open CLI session to the target environment using aws-vault

```sh
aws-vault exec oph-dev
```

Lambda live developement (https://docs.sst.dev/live-lambda-development):

```sh
pnpm exec sst dev --profile=oph-dev --stage=untuva
```

Deploying changes to the environment:

```sh
pnpm exec sst deploy --profile=oph-dev --stage=untuva
```

## Remix default documentation

- [Remix Docs](https://remix.run/docs)

## Development

From your terminal:

```sh
pnpm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

First, build your app for production:

```sh
pnpm run build
```

Then run the app in production mode:

```sh
pnpm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `remix build`

- `build/`
- `public/build/`
