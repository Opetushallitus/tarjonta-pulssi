import type { StackContext} from "sst/constructs";
import { RemixSite, Api } from "sst/constructs";
import { Vpc, SubnetType, SecurityGroup, Port } from "aws-cdk-lib/aws-ec2";
import { Fn, Token, Duration } from "aws-cdk-lib";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import {
  Runtime,
  Architecture,
} from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";


export function TARJONTAPULSSI({ stack }: StackContext) {
  
// Environment specific configurations
  let OPHhostedZone
  let OPHdomainName

  if (stack.stage === "sade")
  {
    OPHhostedZone = "opintopolku.fi";
    OPHdomainName = "tarjonta-pulssi.opintopolku.fi";
  }
  else if (stack.stage === "untuva")
  {
    OPHhostedZone = "untuvaopintopolku.fi";
    OPHdomainName = "tarjonta-pulssi.untuvaopintopolku.fi";
  }
  else if (stack.stage === "hahtuva")
  {
    OPHhostedZone = "hahtuvaopintopolku.fi";
    OPHdomainName = "tarjonta-pulssi.hahtuvaopintopolku.fi";
  }
  else if (stack.stage === "pallero")
  {
    OPHhostedZone = "testiopintopolku.fi";
    OPHdomainName = "tarjonta-pulssi.testiopintopolku.fi";
  }
  else
  {
    OPHhostedZone = undefined
    OPHdomainName = undefined
  }

// Couple helpful debugs for environment logic
  console.log("OPHHostedZone value was: " + OPHhostedZone)
  console.log("OPHdomainName value was: " + OPHdomainName)

// Import existing Opintopolku VPC which is defined in cloud-base
  const ophVpc = Vpc.fromLookup(stack, "myVPC", {
    vpcName: `opintopolku-vpc-${stack.stage}`
  });

  
// Database interaction Lambda, example Lambda from here https://docs.sst.dev/apis#add-an-api
// Augmented with a VPC, Security Group and IAM policy to be able to access RDS databases that
// reside within the VPC
  const siteSg = new SecurityGroup(stack, "SiteSecurityGroup", { vpc: ophVpc })

  const dbApi = new Api(stack, "api", {
    defaults: {
      //authorizer: "iam",
      function: {
        environment: {
        //   KOUTA_POSTGRES_RO_USER: `/${stack.stage}/postgresqls/kouta/readonly-user-name`,
        //   KOUTA_POSTGRES_RO_PASSWORD: `/${stack.stage}/postgresqls/kouta/readonly-user-password`,
        //   PUBLICHOSTEDZONE: `${stack.stage}`,
           TARJONTAPULLSSI_POSTGRES_ADDRESS: `tarjontapulssi.db.${OPHhostedZone}`,
           TARJONTAPULSSI_POSTGRES_APP_USER: `/${stack.stage}/postgresqls/tarjontapulssi/app-user-name`,
           TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${stack.stage}/postgresqls/tarjontapulssi/app-user-password`,
        //   KOUTA_ELASTIC_URL_WITH_CREDENTIALS: `/${stack.stage}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
        },
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:ssm:eu-west-1:*:parameter/${stack.stage}/postgresqls/tarjontapulssi/app-user-name`,
              `arn:aws:ssm:eu-west-1:*:parameter/${stack.stage}/postgresqls/tarjontapulssi/app-user-password`,
            ],
            actions: ["ssm:GetParameter"],
          }),
        ],
        vpc: ophVpc,
        securityGroups: [siteSg],
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS
        }
      }
    },
    routes: {
      "GET /": "packages/functions/src/time.handler",
    },
  });

// Remix site
// Deploys CloudFront, S3 bucket, Remix NodeJS Lambda backend and bunch of
// Other Lambdas to assist with managing the static content deployments
// (clears other resources from the bucket and does CloudFront Cache Invalidations)
  const site = new RemixSite(stack, "site", {
    path: "packages/frontend",
    bind: [dbApi],
    environment: { 
      DB_API_URL: dbApi.url
    },
    customDomain: {
      domainName: OPHdomainName, 
      hostedZone: OPHhostedZone,
    }
  });

  site.attachPermissions([
    dbApi
  ]);

//  SST does not support externalModules for nodejs packages, 
//  therefore using pure CDK to create TarjontaPulssiUpdater Lambda and schedule

  const tarjontaPulssiUpdaterSg = new SecurityGroup(stack, "TarjontaPulssiUpdaterLambdaSecurityGroup", { vpc: ophVpc })

  const tarjontaPulssiUpdaterLambda = new NodejsFunction(
    stack,
    "TarjontaPulssiUpdaterLambda",
    {
      entry: "packages/functions/src/pulssiUpdater.ts",
      handler: "main",
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_YEAR,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      vpc: ophVpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [tarjontaPulssiUpdaterSg],
      environment: {
        KOUTA_POSTGRES_RO_USER: `/${stack.stage}/postgresqls/kouta/readonly-user-name`,
        KOUTA_POSTGRES_RO_PASSWORD: `/${stack.stage}/postgresqls/kouta/readonly-user-password`,
        PUBLICHOSTEDZONE: OPHhostedZone,
        TARJONTAPULSSI_POSTGRES_APP_USER: `/${stack.stage}/postgresqls/tarjontapulssi/app-user-name`,
        TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${stack.stage}/postgresqls/tarjontapulssi/app-user-password`,
        KOUTA_ELASTIC_URL_WITH_CREDENTIALS: `/${stack.stage}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:ssm:eu-west-1:*:parameter/${stack.stage}/postgresqls/kouta/readonly-user-name`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stack.stage}/postgresqls/kouta/readonly-user-password`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stack.stage}/postgresqls/tarjontapulssi/app-user-name`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stack.stage}/postgresqls/tarjontapulssi/app-user-password`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stack.stage}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
          ],
          actions: ["ssm:GetParameter"],
        }),
      ],
      bundling: {
        // pg-native is not available and won't be used. This is letting the
        // bundler (esbuild) know pg-native won't be included in the bundled JS
        // file.
        externalModules: ["aws-sdk", "pg-native"],
        // https://github.com/aws/aws-sdk-js-v3/issues/3023
        sourcesContent: false,
        mainFields: ["module", "main"],
        format: OutputFormat.ESM,
        banner:
          "import {createRequire} from 'module';const require = createRequire(import.meta.url)",
      },
    }
  );
  
    const scheduleRule = new Rule(stack, "scheduleRule", {
      schedule: Schedule.rate(Duration.minutes(10)),
    });
    scheduleRule.addTarget(new LambdaFunction(tarjontaPulssiUpdaterLambda));

// Security group rules so that api can talk to the necessary database on TCP/IP level
// The databases & elastic search are defined in cloud-base, so their security groups
// must be first imported.
  const PostgreSQLSGId = Token.asString(
    Fn.importValue(`${stack.stage}-PostgreSQLSG`)
  );

  const PostgreSQLSG = SecurityGroup.fromSecurityGroupId(
    stack,
    "PostgreSqlsSecurityGroup",
    PostgreSQLSGId
  );

  PostgreSQLSG.connections.allowFrom(siteSg, Port.tcp(5432))

// Security Group rules so that TarjontaPulssi Updater Lambda can talk to Elastic Search endpoint & Tarjonta-pulssi Postgresql
const ElasticSearchEndpointSGId = Token.asString(
  Fn.importValue(`${stack.stage}-ElasticsearchSG`)
);

const ElasticSearchEndpointSG = SecurityGroup.fromSecurityGroupId(
  stack,
  "ElasticSearchEndpointSecurityGroup",
  ElasticSearchEndpointSGId
);

ElasticSearchEndpointSG.connections.allowFrom(tarjontaPulssiUpdaterSg, Port.tcp(9243));
ElasticSearchEndpointSG.connections.allowFrom(tarjontaPulssiUpdaterSg, Port.tcp(443));
PostgreSQLSG.connections.allowFrom(tarjontaPulssiUpdaterSg, Port.tcp(5432));
    



// Stack - level outputs
  stack.addOutputs({
    cloudfronturl: site.url,
    customurl: site.customDomainUrl,
    ApiUrl: dbApi.url,
  });
}