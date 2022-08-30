import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
// import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
// import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export class TarjontaPulssiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const tarjontaPulssiLamda = new NodejsFunction(this, "TarjontaPulssiLambda", {
      entry: "lambda/pulssi.ts",
      handler: "main",
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_YEAR,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(5),
      environment: {
        SLACK_TOKEN_SSM_KEY: "/slack/pilvikehitys/webhook",
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [
            "arn:aws:ssm:eu-west-1:*:parameter/slack/pilvikehitys/webhook",
          ],
          actions: ["ssm:GetParameter"],
        }),
      ],
    });


    // const eventRule = new Rule(this, 'scheduleRule', {
    //   schedule: Schedule.expression('cron(*/5 * * * *)'),
    // });
    // eventRule.addTarget(new LambdaFunction(tarjontaPulssiLamda))

  }
}

