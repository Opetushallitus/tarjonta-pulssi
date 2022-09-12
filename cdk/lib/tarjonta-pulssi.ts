import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { SecurityGroup, Vpc, SubnetType, Port } from "aws-cdk-lib/aws-ec2";
// import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
// import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

interface TarjontaPulssiStackProps extends cdk.StackProps {
  environmentName: string;
  publicHostedZone: string;
}

export class TarjontaPulssiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TarjontaPulssiStackProps) {
    super(scope, id, props);
//    const myvpc = cdk.Fn.importValue(`${props.environmentName}-Vpc`)
//   const myvpc = Vpc.fromLookup(this, 'MyExistingVPC', {vpcName: `opintopolku-vpc-${props.environmentName}`})
    const myvpc = Vpc.fromVpcAttributes(this, 'VPC', {
      vpcId: cdk.Fn.importValue(`${props.environmentName}-Vpc`),
      availabilityZones: [ 
        cdk.Fn.importValue(`${props.environmentName}-SubnetAvailabilityZones`),
      ],
      privateSubnetIds: [ 
        cdk.Fn.importValue(`${props.environmentName}-PrivateSubnet1`),
        cdk.Fn.importValue(`${props.environmentName}-PrivateSubnet2`),
        cdk.Fn.importValue(`${props.environmentName}-PrivateSubnet3`),
      ],
    });
   
    const TarjontaPulssiLambdaSecurityGroup = new SecurityGroup(this, "TarjontaPulssiLambdaSG", {
      vpc: myvpc,
    });

    const tarjontaPulssiLamda = new NodejsFunction(this, "TarjontaPulssiLambda", {
      entry: "lambda/pulssi.ts",
      handler: "main",
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_YEAR,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(5),
      vpc: myvpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      },
      securityGroups: [ SecurityGroup.fromSecurityGroupId(
        this,
        "ImmutableSecurityGroup",
        TarjontaPulssiLambdaSecurityGroup.securityGroupId,
        { mutable: false }
      ),
      ],
      environment: {
        KOUTA_POSTGRES_RO_USER: `/${props.environmentName}/postgresqls/kouta/readonly-user-name`,
        KOUTA_POSTGRES_RO_PASSWORD: `/${props.environmentName}/postgresqls/kouta/readonly-user-password`,
        PUBLICHOSTEDZONE: `${props.publicHostedZone}`,
        TARJONTAPULSSI_POSTGRES_APP_USER: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-name`,
        TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-password`,
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/kouta/readonly-user-name`,
            `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/kouta/readonly-user-password`,
            `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/tarjontapulssi/app-user-name`,
            `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/tarjontapulssi/app-user-password`,
          ],
          actions: ["ssm:GetParameter"],
        }),
      ],
      bundling: {
        // pg-native is not available and won't be used. This is letting the
        // bundler (esbuild) know pg-native won't be included in the bundled JS
        // file.
        externalModules: ['pg-native'],
        // https://github.com/aws/aws-sdk-js-v3/issues/3023
        sourcesContent: false,
        mainFields: ['module', 'main']
      }
    });


    // const eventRule = new Rule(this, 'scheduleRule', {
    //   schedule: Schedule.expression('cron(*/5 * * * *)'),
    // });
    // eventRule.addTarget(new LambdaFunction(tarjontaPulssiLamda))


     /**
     * Fetch PostgreSQLS SG name and ID
     */

    [
      { name: "TarjontaPulssiLambdaSG", value: TarjontaPulssiLambdaSecurityGroup.securityGroupId }
    ].map(output => {
      new cdk.CfnOutput(this, `${output.name}-Output`, {
        exportName: `${props.environmentName}-${output.name}`,
        value: output.value
      });
    });

    const PostgreSQLSGId = cdk.Token.asString(
      cdk.Fn.importValue(`${props.environmentName}-PostgreSQLSG`)
    );

    const PostgreSQLSG = SecurityGroup.fromSecurityGroupId(
      this,
      "PostgreSqlsSecurityGroup",
      PostgreSQLSGId
    );

    // Ingress TarjontapulssiLambda -> PostgreSqls
    [5432].map((port) => {
      PostgreSQLSG.addIngressRule(
        TarjontaPulssiLambdaSecurityGroup,
        Port.tcp(port)
      );
    });

  }
}

