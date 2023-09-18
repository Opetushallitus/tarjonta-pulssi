import { StackContext, RemixSite, Api } from "sst/constructs";
import { Vpc, SubnetType, SecurityGroup, Port, Connections } from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import { Fn, Token } from "aws-cdk-lib";




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


  // const myvpc = Vpc.fromVpcAttributes(stack, "VPC", {
  //   vpcId: Fn.importValue(`${stack.stage}-Vpc`),
  //   availabilityZones: [
  //     Fn.importValue(`${stack.stage}-SubnetAvailabilityZones`),
  //   ],
  //   privateSubnetIds: [
  //     Fn.importValue(`${stack.stage}-PrivateSubnet1`),
  //     Fn.importValue(`${stack.stage}-PrivateSubnet2`),
  //     Fn.importValue(`${stack.stage}-PrivateSubnet3`),
  //   ],
  // });

// Import existing Database
 

// new RDS(stack, "Database", {
//     engine: "postgresql11.13",
//     defaultDatabaseName: "acme",
//     cdk: {
//       cluster: rds.ServerlessCluster.fromServerlessClusterAttributes(
//         stack,
//         "ICluster",
//         {
//           clusterIdentifier: `${stack.stage}-tarjontapulssi`,
//         }
//       ),
//       secret: secretsManager.Secret.fromSecretAttributes(stack, "ISecret", {
//         secretPartialArn:
//           "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
//       }),
//     },
//   });
  
// Database interaction Lambda, example Lambda from here
  const siteSg = new SecurityGroup(stack, "SiteSecurityGroup", { vpc: ophVpc })

  const dbApi = new Api(stack, "api", {
    defaults: {
      authorizer: "iam",
      function: {
        // environment: {
        //   KOUTA_POSTGRES_RO_USER: `/${stack.stage}/postgresqls/kouta/readonly-user-name`,
        //   KOUTA_POSTGRES_RO_PASSWORD: `/${stack.stage}/postgresqls/kouta/readonly-user-password`,
        //   PUBLICHOSTEDZONE: `${stack.stage}`,
        //   TARJONTAPULSSI_POSTGRES_APP_USER: `/${stack.stage}/postgresqls/tarjontapulssi/app-user-name`,
        //   TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${stack.stage}/postgresqls/tarjontapulssi/app-user-password`,
        //   KOUTA_ELASTIC_URL_WITH_CREDENTIALS: `/${stack.stage}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
        // },
        
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
    bind: [dbApi],
    customDomain: {
      domainName: OPHdomainName, 
      hostedZone: OPHhostedZone,
    }
  });

// Security group rules so that api can talk to the necessary database on TCP/IP level
// The databases & elastic search are defined in cloud-base, so their security groups
// must be first imported.
  const PostgreSQLSGId = Token.asString(
    Fn.importValue(`${stack.stage}-PostgreSQLSG`)
  );

  const PostgreSQLSG = SecurityGroup.fromSecurityGroupId(
    this,
    "PostgreSqlsSecurityGroup",
    PostgreSQLSGId
  );

  // Ingress TarjontapulssiLambda -> PostgreSqls
  // [5432].forEach((port) => {
  //   PostgreSQLSG.addIngressRule(
  //     TarjontaPulssiLambdaSecurityGroup,
  //     Port.tcp(port)
  //   );
  // });
  
  const ElasticSearchEndpointSGId = Token.asString(
    Fn.importValue(`${stack.stage}-ElasticsearchSG`)
  );
  
  const ElasticSearchEndpointSG = SecurityGroup.fromSecurityGroupId(
    this,
    "ElasticSearchEndpointSecurityGroup",
    ElasticSearchEndpointSGId
  );

  // Ingress TarjontapulssiLambda -> ElasticSearchEndpoint
  // [9243, 443].forEach((port) => {
  //   ElasticSearchEndpointSG.addIngressRule(
  //     api,
  //     Port.tcp(port)
  //   );
  // });



  // dbApi.Connections.allowTo(
  //   PostgreSQLSG,
  //   Port.tcp(3306)
  //   )
  
  // [9243, 443].forEach((port) => {
  //   ElasticSearchEndpointSG.addIngressRule(
  //     dbApi,
  //     Port.tcp(port)
  //   );
  // });
    
  PostgreSQLSG.connections.allowFrom(siteSg, Port.tcp(3306))

// Stack outputs
  stack.addOutputs({
    cloudfronturl: site.url,
    customurl: site.customDomainUrl,
    ApiUrl: dbApi.url,
  });
};