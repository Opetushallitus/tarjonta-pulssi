# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Lambdan buildaus ja deploy

* `npm run build`   			buildaa Lambdan TypeScriptit
* `npx cdk synth`   			generoi CloudFormation template CDK koodista
* `aws-vault exec AWSPROFIILI`   	Avaa CLI sessio kohdetilille
* `npx cdk -c "environment=YMPÄRISTÖ"` 	deployaa CloudFormation template kohdeympäristöön
