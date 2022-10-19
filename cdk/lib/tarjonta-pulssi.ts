import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  Runtime,
  Architecture,
  LayerVersion,
  Code,
} from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { SecurityGroup, Vpc, SubnetType, Port } from "aws-cdk-lib/aws-ec2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";

interface TarjontaPulssiStackProps extends cdk.StackProps {
  environmentName: string;
  publicHostedZone: string;
  publicHostedZoneId: string;
}

export class TarjontaPulssiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TarjontaPulssiStackProps) {
    super(scope, id, props);
    const myvpc = Vpc.fromVpcAttributes(this, "VPC", {
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

    const zone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "PublicHostedZone",
      {
        zoneName: `${props.publicHostedZone}.`,
        hostedZoneId: `${props.publicHostedZoneId}`,
      }
    );

    // Content bucket
    const staticContentBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `tarjonta-pulssi.${props.publicHostedZone}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "cloudfront-OAI",
      {
        comment: `OAI for tarjonta-pulssi.${props.publicHostedZone}`,
      }
    );

    // Grant access to cloudfront
    staticContentBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [staticContentBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    staticContentBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [staticContentBucket.bucketArn],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    // TLS certificate
    const certificate = new acm.DnsValidatedCertificate(
      this,
      "SiteCertificate",
      {
        domainName: `tarjonta-pulssi.${props.publicHostedZone}`,
        hostedZone: zone,
        region: "us-east-1", // Cloudfront only checks this region for certificates.
      }
    );

    // CloudFront distribution
    const StaticContentBucketOrigin = new cloudfront_origins.S3Origin(
      staticContentBucket,
      { originAccessIdentity: cloudfrontOAI }
    );

    const noCachePolicy = new cloudfront.CachePolicy(
      this,
      `noCachePolicy-${props.environmentName}-tarjonta-pulssi`,
      {
        cachePolicyName: `noCachePolicy-${props.environmentName}-tarjonta-pulssi`,
        defaultTtl: cdk.Duration.minutes(0),
        minTtl: cdk.Duration.minutes(0),
        maxTtl: cdk.Duration.minutes(0),
      }
    );

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      certificate: certificate,
      defaultRootObject: "index.html",
      domainNames: [`tarjonta-pulssi.${props.publicHostedZone}`],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: "/error.html",
          ttl: cdk.Duration.minutes(30),
        },
      ],
      defaultBehavior: {
        origin: StaticContentBucketOrigin,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        "/pulssi.json": {
          origin: StaticContentBucketOrigin,
          cachePolicy: noCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
    });

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, "SiteAliasRecord", {
      recordName: `tarjonta-pulssi.${props.publicHostedZone}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
      zone,
    });

    const TarjontaPulssiLambdaSecurityGroup = new SecurityGroup(
      this,
      "TarjontaPulssiLambdaSG",
      {
        vpc: myvpc,
      }
    );

    const tarjontaPulssiPublisherLambda = new NodejsFunction(
      this,
      "TarjontaPulssiPublisherLambda",
      {
        entry: "lambda/pulssiPublisher.ts",
        handler: "main",
        runtime: Runtime.NODEJS_16_X,
        logRetention: RetentionDays.ONE_YEAR,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(10),
        vpc: myvpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        securityGroups: [TarjontaPulssiLambdaSecurityGroup],
        environment: {
          PUBLICHOSTEDZONE: `${props.publicHostedZone}`,
          TARJONTAPULSSI_POSTGRES_RO_USER: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-name`,
          TARJONTAPULSSI_POSTGRES_RO_PASSWORD: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-password`,
        },
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/tarjontapulssi/app-user-name`,
              `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/tarjontapulssi/app-user-password`,
            ],
            actions: ["ssm:GetParameter"],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [`${staticContentBucket.bucketArn}`],
            actions: ["s3:ListBucket"],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [`${staticContentBucket.bucketArn}/*`],
            actions: [
              "s3:PutObject",
              "s3:PutObjectAcl",
              "s3:GetObject",
              "s3:getObjectAcl",
            ],
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

    const tarjontaPulssiUpdaterLambda = new NodejsFunction(
      this,
      "TarjontaPulssiUpdaterLambda",
      {
        entry: "lambda/pulssiUpdater.ts",
        handler: "main",
        runtime: Runtime.NODEJS_16_X,
        logRetention: RetentionDays.ONE_YEAR,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(10),
        vpc: myvpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        securityGroups: [TarjontaPulssiLambdaSecurityGroup],
        environment: {
          KOUTA_POSTGRES_RO_USER: `/${props.environmentName}/postgresqls/kouta/readonly-user-name`,
          KOUTA_POSTGRES_RO_PASSWORD: `/${props.environmentName}/postgresqls/kouta/readonly-user-password`,
          PUBLICHOSTEDZONE: `${props.publicHostedZone}`,
          TARJONTAPULSSI_POSTGRES_APP_USER: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-name`,
          TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-password`,
          KOUTA_ELASTIC_URL_WITH_CREDENTIALS: `/${props.environmentName}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
          PUBLISHER_LAMBDA_NAME: tarjontaPulssiPublisherLambda.functionName,
        },
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/kouta/readonly-user-name`,
              `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/kouta/readonly-user-password`,
              `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/tarjontapulssi/app-user-name`,
              `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/postgresqls/tarjontapulssi/app-user-password`,
              `arn:aws:ssm:eu-west-1:*:parameter/${props.environmentName}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
            ],
            actions: ["ssm:GetParameter"],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [tarjontaPulssiPublisherLambda.functionArn],
            actions: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
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

    const dbMigrationsLayer = new LayerVersion(this, "db-migrations-layer", {
      compatibleRuntimes: [Runtime.NODEJS_16_X],
      code: Code.fromAsset("db/migrations"),
      description: "umzug db migration files",
    });

    const tarjontaPulssiDbMigratorLambda = new NodejsFunction(
      this,
      "TarjontaPulssiDbMigratorLambda",
      {
        entry: "lambda/pulssiDbMigrator.ts",
        handler: "main",
        runtime: Runtime.NODEJS_16_X,
        logRetention: RetentionDays.ONE_YEAR,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.minutes(2),
        vpc: myvpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        securityGroups: [TarjontaPulssiLambdaSecurityGroup],
        environment: {
          PUBLICHOSTEDZONE: `${props.publicHostedZone}`,
          TARJONTAPULSSI_POSTGRES_APP_USER: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-name`,
          TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${props.environmentName}/postgresqls/tarjontapulssi/app-user-password`,
        },
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
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
          externalModules: ["aws-sdk", "pg-native"],
          // https://github.com/aws/aws-sdk-js-v3/issues/3023
          sourcesContent: false,
          mainFields: ["module", "main"],
          format: OutputFormat.ESM,
          banner:
            "import {createRequire} from 'module';const require = createRequire(import.meta.url)",
        },
        layers: [dbMigrationsLayer],
      }
    );

    const deployment = new s3deploy.BucketDeployment(
      this,
      "DeployWithInvalidation",
      {
        sources: [s3deploy.Source.asset("../app/dist")],
        destinationBucket: staticContentBucket,
        distribution,
        distributionPaths: ["/index.html", "/assets/*", "/translations.json"],
        prune: false,
      }
    );

    const scheduleRule = new Rule(this, "scheduleRule", {
      schedule: Schedule.rate(cdk.Duration.minutes(10)),
    });
    scheduleRule.addTarget(new LambdaFunction(tarjontaPulssiUpdaterLambda));

    // Trigger db migration Lambda on CloudFormation CREATE_COMPLETE & UPDATE_COMPLETE
    const stackChangeRule = new Rule(this, "stackChangeRule", {
      eventPattern: {
        source: ["aws.cloudformation"],
        resources: [this.stackId],
        detail: {
          "status-details.status": ["CREATE_COMPLETE", "UPDATE_COMPLETE"],
        },
      },
    });
    stackChangeRule.addTarget(
      new LambdaFunction(tarjontaPulssiDbMigratorLambda)
    );

    // Trigger also updater-lambda to create pulssi.json
    stackChangeRule.addTarget(new LambdaFunction(tarjontaPulssiUpdaterLambda));

    /**
     * Fetch PostgreSQLS SG name and ID
     */
    [
      {
        name: "TarjontaPulssiLambdaSG",
        value: TarjontaPulssiLambdaSecurityGroup.securityGroupId,
      },
    ].map((output) => {
      new cdk.CfnOutput(this, `${output.name}-Output`, {
        exportName: `${props.environmentName}-${output.name}`,
        value: output.value,
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
    [5432].forEach((port) => {
      PostgreSQLSG.addIngressRule(
        TarjontaPulssiLambdaSecurityGroup,
        Port.tcp(port)
      );
    });
  }
}
