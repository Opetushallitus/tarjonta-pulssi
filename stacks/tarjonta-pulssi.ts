import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, Token, type StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { CfnWorkGroup } from "aws-cdk-lib/aws-athena";
import type { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HttpVersion,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
  type BehaviorOptions,
} from "aws-cdk-lib/aws-cloudfront";
import { FunctionUrlOrigin, S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import {
  CfnTable,
  DataFormat,
  Database,
  S3Table,
  S3TableStorage,
  Schema,
  type Column,
} from "aws-cdk-lib/aws-glue";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  Architecture,
  Code,
  FunctionUrlAuthType,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat, type BundlingOptions } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { AaaaRecord, ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { BlockPublicAccess, Bucket, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, CacheControl, Source } from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";

/**
 * Lambdoissa käytettävä Node-ajonaikaisuus. Pidä linjassa `.nvmrc`:n kanssa.
 * React Router 8 vaatii Noden >= 22.22.
 */
const LAMBDA_RUNTIME = Runtime.NODEJS_24_X;

/**
 * Lokien säilytysaika. CloudFrontin access log ja SSR-lambdan access log sisältävät
 * asiakkaan IP-osoitteen, joten tämä on tietosuojapäätös — älä pidennä ilman
 * perustetta.
 */
const LOG_RETENTION = RetentionDays.TWO_YEARS;

/**
 * Sama arvo S3:n lifecycle-säännölle, joka ottaa `Duration`in CloudWatchin enumin
 * sijaan. Johdettu, jotta arvot eivät pääse erkaantumaan: `RetentionDays`-enumin
 * arvot ovat päivälukuja.
 */
const ACCESS_LOG_RETENTION = Duration.days(LOG_RETENTION);

/** Athenan kyselytulokset kirjoitetaan lokiämpärin tämän prefiksin alle. */
const ATHENA_RESULTS_PREFIX = "athena-results/";

/** CloudFrontin access logit kirjoitetaan lokiämpärin tämän prefiksin alle. */
const CLOUDFRONT_LOG_PREFIX = "cloudfront/";

/**
 * CloudFrontin standard logging (legacy) -kenttäjärjestys. Sarakenimet ovat samat
 * kuin AWS:n dokumentaation valmiissa DDL:ssä, jotta sieltä kopioidut esimerkkikyselyt
 * toimivat sellaisenaan. Huom. että `date` on Athenassa varattu sana ja vaatii
 * kyselyssä backtickit.
 */
const CLOUDFRONT_LOG_COLUMNS: Array<Column> = [
  { name: "date", type: Schema.DATE },
  { name: "time", type: Schema.STRING },
  { name: "location", type: Schema.STRING },
  { name: "bytes", type: Schema.BIG_INT },
  { name: "request_ip", type: Schema.STRING },
  { name: "method", type: Schema.STRING },
  { name: "host", type: Schema.STRING },
  { name: "uri", type: Schema.STRING },
  { name: "status", type: Schema.INTEGER },
  { name: "referrer", type: Schema.STRING },
  { name: "user_agent", type: Schema.STRING },
  { name: "query_string", type: Schema.STRING },
  { name: "cookie", type: Schema.STRING },
  { name: "result_type", type: Schema.STRING },
  { name: "request_id", type: Schema.STRING },
  { name: "host_header", type: Schema.STRING },
  { name: "request_protocol", type: Schema.STRING },
  { name: "request_bytes", type: Schema.BIG_INT },
  { name: "time_taken", type: Schema.FLOAT },
  { name: "xforwarded_for", type: Schema.STRING },
  { name: "ssl_protocol", type: Schema.STRING },
  { name: "ssl_cipher", type: Schema.STRING },
  { name: "response_result_type", type: Schema.STRING },
  { name: "http_version", type: Schema.STRING },
  { name: "fle_status", type: Schema.STRING },
  { name: "fle_encrypted_fields", type: Schema.INTEGER },
  { name: "c_port", type: Schema.INTEGER },
  { name: "time_to_first_byte", type: Schema.FLOAT },
  { name: "x_edge_detailed_result_type", type: Schema.STRING },
  { name: "sc_content_type", type: Schema.STRING },
  { name: "sc_content_len", type: Schema.BIG_INT },
  { name: "sc_range_start", type: Schema.BIG_INT },
  { name: "sc_range_end", type: Schema.BIG_INT },
];

/** Vite-buildin hajautetut assetit tarjoillaan tämän polun alta. */
const CLIENT_BUILD_DIR = "build/client";

/**
 * Yhteinen esbuild-kokoonpano. `pg-native` ei ole saatavilla eikä sitä käytetä,
 * joten bundlerille kerrotaan jättää se ulkopuolelle.
 */
const NODE_BUNDLING: BundlingOptions = {
  externalModules: ["pg-native"],
  // https://github.com/aws/aws-sdk-js-v3/issues/3023
  sourcesContent: false,
  mainFields: ["module", "main"],
  format: OutputFormat.ESM,
  banner: "import {createRequire} from 'module';const require = createRequire(import.meta.url)",
};

export interface CustomDomain {
  /** Sivuston domain, esim. `tarjonta-pulssi.untuvaopintopolku.fi`. */
  domainName: string;
  /** Route53-vyöhykkeen nimi, esim. `untuvaopintopolku.fi`. */
  hostedZoneName: string;
  /** us-east-1 -alueella oleva sertifikaatti, ks. `CertificateStack`. */
  certificate: ICertificate;
}

export interface TarjontaPulssiStackProps extends StackProps {
  stage: string;
  /** Julkinen hosted zone, jonka alle tietokannan osoite muodostetaan. */
  publicHostedZone: string;
  /**
   * Jätä pois, kun stack deployataan ilman omaa domainia. Tarvitaan kerran
   * siirryttäessä SST:n CloudFront-distribuutiosta tähän, ks. README.
   */
  customDomain?: CustomDomain;
}

export class TarjontaPulssiStack extends Stack {
  constructor(scope: Construct, id: string, props: TarjontaPulssiStackProps) {
    super(scope, id, props);

    const { stage, publicHostedZone, customDomain } = props;

    /**
     * Lambdan lokiryhmä kiinteällä nimellä. Oletuksena Lambda luo ryhmän nimellä
     * `/aws/lambda/<funktion nimi>`, ja CDK:n generoima funktionimi sisältää
     * satunnaisen loppuosan — lokit siis vaihtaisivat paikkaa jos funktio joskus
     * korvataan, ja nimistä on hankala päätellä mikä lambda on kyseessä.
     *
     * Kiinteä nimi tarkoittaa myös, ettei ryhmää voi luoda uudelleen jos
     * samanniminen on jo olemassa. Siksi testiympäristöissä ryhmä poistetaan
     * stackin mukana; tuotannossa lokit ovat sen riskin arvoisia.
     */
    const namedLogGroup = (constructId: string, logGroupName: string) =>
      new LogGroup(this, constructId, {
        logGroupName,
        retention: LOG_RETENTION,
        removalPolicy: stage === "sade" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      });

    const lambdaLogGroup = (constructId: string, slug: string) =>
      namedLogGroup(constructId, `/aws/lambda/${stage}-tarjonta-pulssi-${slug}`);

    /**
     * SSR-lambdan access log omassa ryhmässään. Erillinen ryhmä siksi, että rivit
     * ovat puhdasta JSONia ilman Lambdan omaa `timestamp requestId INFO` -etuliitettä,
     * ja että ryhmän voi ohjata sellaisenaan keskitettyyn lokinkeruuseen ilman että
     * mukaan tulee sovelluksen virhetulosteita. Nimi on tarkoituksella eri prefiksin
     * alla kuin lambdojen omat ryhmät, koska Lambda ei omista tätä.
     */
    const ssrAccessLogGroup = namedLogGroup(
      "SiteServerAccessLogGroup",
      `/tarjonta-pulssi/${stage}/access`
    );

    // Import existing Opintopolku VPC which is defined in cloud-base
    const ophVpc = Vpc.fromLookup(this, "myVPC", {
      vpcName: `opintopolku-vpc-${stage}`,
    });

    // Database interaction Lambda, augmented with a VPC, Security Group and IAM policy
    // to be able to access RDS databases that reside within the VPC
    const siteSg = new SecurityGroup(this, "SiteSecurityGroup", { vpc: ophVpc });

    const dbApiFunction = new NodejsFunction(this, "PulssiDataFetcherLambda", {
      entry: "functions/pulssiDataFetcher.ts",
      handler: "handler",
      runtime: LAMBDA_RUNTIME,
      logGroup: lambdaLogGroup("PulssiDataFetcherLogGroup", "db-api"),
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      vpc: ophVpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [siteSg],
      environment: {
        TARJONTAPULLSSI_POSTGRES_ADDRESS: `tarjontapulssi.db.${publicHostedZone}`,
        TARJONTAPULSSI_POSTGRES_APP_USER: `/${stage}/postgresqls/tarjontapulssi/app-user-name`,
        TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${stage}/postgresqls/tarjontapulssi/app-user-password`,
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/tarjontapulssi/app-user-name`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/tarjontapulssi/app-user-password`,
          ],
          actions: ["ssm:GetParameter"],
        }),
      ],
      bundling: NODE_BUNDLING,
    });

    const dbApi = new HttpApi(this, "DbApi");
    dbApi.addRoutes({
      path: "/",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("PulssiDataFetcherIntegration", dbApiFunction),
    });

    // Remix/React Router SSR -lambda. Bundlaa `build/server/index.js`:n, joten
    // `react-router build` on ajettava ennen synthiä.
    const ssrFunction = new NodejsFunction(this, "SiteServerLambda", {
      entry: "server/lambda.ts",
      handler: "handler",
      runtime: LAMBDA_RUNTIME,
      logGroup: lambdaLogGroup("SiteServerLogGroup", "ssr"),
      architecture: Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(20),
      environment: {
        DB_API_URL: dbApi.apiEndpoint,
        NODE_ENV: "production",
        ACCESS_LOG_GROUP: ssrAccessLogGroup.logGroupName,
        ENVIRONMENT: stage,
        // Ympäristön Opintopolun etusivu (esim. `https://untuvaopintopolku.fi`), johon
        // sivuston otsakkeen logo linkittää. 
        OPINTOPOLKU_URL: `https://${publicHostedZone}`,
      },
      bundling: {
        ...NODE_BUNDLING,
        define: { "process.env.NODE_ENV": '"production"' },
      },
    });

    ssrAccessLogGroup.grantWrite(ssrFunction);

    // HUOM: CloudFront allekirjoittaa Function URL -originille menevät pyynnöt
    // (OAC). Lambda ei tue allekirjoittamatonta bodyä, joten PUT/POST vaatisi
    // selaimelta `x-amz-content-sha256`-otsakkeen — mihin se ei pysty. Tämä
    // reitti kelpaa siis vain GET/HEAD-liikenteelle. Sovelluksessa ei ole yhtään
    // `action`-exporttia eikä lomaketta; jos sellainen lisätään, SSR-lambda on
    // siirrettävä API Gatewayn taakse.
    const ssrFunctionUrl = ssrFunction.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
    });

    const assetsBucket = new Bucket(this, "SiteAssetsBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFrontin access log (standard logging, legacy). Kattaa kaikki
    // selainpyynnöt — myös staattiset assetit ja välimuistiosumat, jotka eivät
    // koskaan päädy SSR-lambdalle.
    //
    // Legacy-toimitus käyttää ACL:ia, joten tämä ämpäri on pakko luoda
    // `OBJECT_WRITER`-omistajuudella. Rajaus koskee vain lokiämpäriä;
    // `SiteAssetsBucket` pysyy ACL:ttomassa oletuksessa.
    const accessLogBucket = new Bucket(this, "SiteAccessLogBucket", {
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        { prefix: CLOUDFRONT_LOG_PREFIX, expiration: ACCESS_LOG_RETENTION },
        // Athenan kyselytulokset ovat välitulosteita, eivät lokidataa.
        { prefix: ATHENA_RESULTS_PREFIX, expiration: Duration.days(7) },
      ],
      // Tuotannon lokit ovat ainoa kopio käyttöhistoriasta, joten niitä ei
      // poisteta stackin mukana. Testiympäristöissä siivous on tärkeämpää.
      ...(stage === "sade"
        ? { removalPolicy: RemovalPolicy.RETAIN }
        : { removalPolicy: RemovalPolicy.DESTROY, autoDeleteObjects: true }),
    });

    // CloudFrontin lokit luettaviksi Athenalla: Glue-katalogi kuvaa TSV-muodon ja
    // työryhmä määrää mihin kyselyjen tulokset kirjoitetaan.
    //
    // HUOM: legacy-lokit eivät ole partitioituja — päivämäärä on tiedostonimessä
    // eikä hakemistopolussa — joten jokainen kysely lukee koko prefiksin läpi.
    // Tämän palvelun liikennemäärällä se ei ole ongelma. Partitiointi edellyttäisi
    // siirtymistä standard logging v2:een, ks. README.
    const logsDatabase = new Database(this, "LogsDatabase", {
      databaseName: `tarjonta_pulssi_${stage}`,
    });

    const cloudFrontLogsTable = new S3Table(this, "CloudFrontAccessLogTable", {
      database: logsDatabase,
      tableName: "cloudfront_access_logs",
      storage: S3TableStorage.fromBucket(accessLogBucket),
      s3Prefix: CLOUDFRONT_LOG_PREFIX,
      dataFormat: DataFormat.TSV,
      compressed: true,
      columns: CLOUDFRONT_LOG_COLUMNS,
      // CloudFront kirjoittaa jokaisen tiedoston alkuun kaksi otsikkoriviä
      // (#Version ja #Fields).
      parameters: { "skip.header.line.count": "2" },
    });

    // `DataFormat.TSV` valitsee LazySimpleSerDen mutta ei aseta kenttäerotinta,
    // jolloin käytössä on sen oletus `\001` eikä sarkain — koko rivi luettaisiin
    // yhteen sarakkeeseen. Vastaa AWS:n DDL:n kohtaa
    // `ROW FORMAT DELIMITED FIELDS TERMINATED BY '\t'`.
    (cloudFrontLogsTable.node.defaultChild as CfnTable).addPropertyOverride(
      "TableInput.StorageDescriptor.SerdeInfo.Parameters",
      { "field.delim": "\t", "serialization.format": "\t" }
    );

    const logsWorkGroup = new CfnWorkGroup(this, "LogsWorkGroup", {
      name: `tarjonta-pulssi-${stage}`,
      description: `Tarjonta-pulssin lokikyselyt (${stage})`,
      // Sallii työryhmän poiston vaikka kyselyhistoriaa olisi kertynyt.
      recursiveDeleteOption: true,
      workGroupConfiguration: {
        // Estää käyttäjää ohittamasta tulossijaintia omalla asetuksellaan.
        enforceWorkGroupConfiguration: true,
        resultConfiguration: {
          outputLocation: accessLogBucket.s3UrlForObject(ATHENA_RESULTS_PREFIX),
          encryptionConfiguration: { encryptionOption: "SSE_S3" },
        },
      },
    });

    const staticBehavior: BehaviorOptions = {
      origin: S3BucketOrigin.withOriginAccessControl(assetsBucket),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      compress: true,
    };

    const distribution = new Distribution(this, "SiteDistribution", {
      comment: `tarjonta-pulssi ${stage}`,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      logBucket: accessLogBucket,
      logFilePrefix: CLOUDFRONT_LOG_PREFIX,
      // Oletus, mutta kirjoitettu näkyviin: evästeitä ei lokiteta.
      logIncludesCookies: false,
      defaultBehavior: {
        origin: FunctionUrlOrigin.withOriginAccessControl(ssrFunctionUrl),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        // SSR-vastauksia ei välimuistiteta, mutta kysely- ja kieliotsakkeet on
        // välitettävä alkuperään.
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        compress: true,
      },
      additionalBehaviors: {
        "/assets/*": staticBehavior,
        "/favicon.ico": staticBehavior,
      },
      ...(customDomain
        ? { domainNames: [customDomain.domainName], certificate: customDomain.certificate }
        : {}),
    });

    // Viten hajautetut tiedostonimet ovat ikuisesti välimuistitettavia.
    new BucketDeployment(this, "SiteHashedAssetsDeployment", {
      sources: [Source.asset(`${CLIENT_BUILD_DIR}/assets`)],
      destinationBucket: assetsBucket,
      destinationKeyPrefix: "assets",
      cacheControl: [CacheControl.fromString("public,max-age=31536000,immutable")],
      prune: true,
    });

    // `public/`-hakemiston tiedostot säilyttävät nimensä, joten ne invalidoidaan.
    new BucketDeployment(this, "SitePublicFilesDeployment", {
      sources: [Source.asset(CLIENT_BUILD_DIR, { exclude: ["assets/**"] })],
      destinationBucket: assetsBucket,
      cacheControl: [CacheControl.fromString("public,max-age=3600")],
      prune: false,
      distribution,
      distributionPaths: ["/favicon.ico"],
    });

    if (customDomain) {
      const hostedZone = HostedZone.fromLookup(this, "SiteHostedZone", {
        domainName: customDomain.hostedZoneName,
      });
      const recordProps = {
        zone: hostedZone,
        recordName: customDomain.domainName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      };
      new ARecord(this, "SiteAliasRecord", recordProps);
      new AaaaRecord(this, "SiteAliasRecordAAAA", recordProps);
    }

    const tarjontaPulssiUpdaterSg = new SecurityGroup(
      this,
      "TarjontaPulssiUpdaterLambdaSecurityGroup",
      { vpc: ophVpc }
    );

    const tarjontaPulssiUpdaterLambda = new NodejsFunction(this, "TarjontaPulssiUpdaterLambda", {
      entry: "functions/pulssiUpdater.ts",
      handler: "main",
      runtime: LAMBDA_RUNTIME,
      logGroup: lambdaLogGroup("TarjontaPulssiUpdaterLogGroup", "updater"),
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      vpc: ophVpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [tarjontaPulssiUpdaterSg],
      environment: {
        KOUTA_POSTGRES_RO_USER: `/${stage}/postgresqls/kouta/readonly-user-name`,
        KOUTA_POSTGRES_RO_PASSWORD: `/${stage}/postgresqls/kouta/readonly-user-password`,
        PUBLICHOSTEDZONE: publicHostedZone,
        TARJONTAPULSSI_POSTGRES_APP_USER: `/${stage}/postgresqls/tarjontapulssi/app-user-name`,
        TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${stage}/postgresqls/tarjontapulssi/app-user-password`,
        KOUTA_ELASTIC_URL_WITH_CREDENTIALS: `/${stage}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/kouta/readonly-user-name`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/kouta/readonly-user-password`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/tarjontapulssi/app-user-name`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/tarjontapulssi/app-user-password`,
            `arn:aws:ssm:eu-west-1:*:parameter/${stage}/services/kouta-indeksoija/kouta-indeksoija-elastic7-url-with-credentials`,
          ],
          actions: ["ssm:GetParameter"],
        }),
      ],
      bundling: NODE_BUNDLING,
    });

    const scheduleRule = new Rule(this, "scheduleRule", {
      schedule: Schedule.rate(Duration.minutes(10)),
    });
    scheduleRule.addTarget(new LambdaFunction(tarjontaPulssiUpdaterLambda));

    // Database migrations

    const dbMigrationsLayer = new LayerVersion(this, "db-migrations-layer", {
      compatibleRuntimes: [LAMBDA_RUNTIME],
      code: Code.fromAsset("shared/db/migrations"),
      description: "umzug db migration files",
    });

    const tarjontaPulssiDbMigratorLambda = new NodejsFunction(
      this,
      "TarjontaPulssiDbMigratorLambda",
      {
        entry: "functions/pulssiDbMigrator.ts",
        handler: "main",
        runtime: LAMBDA_RUNTIME,
        logGroup: lambdaLogGroup("TarjontaPulssiDbMigratorLogGroup", "db-migrator"),
        architecture: Architecture.ARM_64,
        timeout: Duration.minutes(2),
        vpc: ophVpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [siteSg],
        environment: {
          PUBLICHOSTEDZONE: publicHostedZone,
          TARJONTAPULSSI_POSTGRES_APP_USER: `/${stage}/postgresqls/tarjontapulssi/app-user-name`,
          TARJONTAPULSSI_POSTGRES_APP_PASSWORD: `/${stage}/postgresqls/tarjontapulssi/app-user-password`,
        },
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/tarjontapulssi/app-user-name`,
              `arn:aws:ssm:eu-west-1:*:parameter/${stage}/postgresqls/tarjontapulssi/app-user-password`,
            ],
            actions: ["ssm:GetParameter"],
          }),
        ],
        bundling: NODE_BUNDLING,
        layers: [dbMigrationsLayer],
      }
    );

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
    stackChangeRule.addTarget(new LambdaFunction(tarjontaPulssiDbMigratorLambda));

    // Security group rules so that api can talk to the necessary database on TCP/IP level
    // The databases & elastic search are defined in cloud-base, so their security groups
    // must be first imported.
    const PostgreSQLSGId = Token.asString(Fn.importValue(`${stage}-PostgreSQLSG`));

    const PostgreSQLSG = SecurityGroup.fromSecurityGroupId(
      this,
      "PostgreSqlsSecurityGroup",
      PostgreSQLSGId
    );

    PostgreSQLSG.connections.allowFrom(siteSg, Port.tcp(5432));

    // Security Group rules so that TarjontaPulssi Updater Lambda can talk to Elastic Search endpoint & Tarjonta-pulssi Postgresql
    const ElasticSearchEndpointSGId = Token.asString(Fn.importValue(`${stage}-ElasticsearchSG`));

    const ElasticSearchEndpointSG = SecurityGroup.fromSecurityGroupId(
      this,
      "ElasticSearchEndpointSecurityGroup",
      ElasticSearchEndpointSGId
    );

    ElasticSearchEndpointSG.connections.allowFrom(tarjontaPulssiUpdaterSg, Port.tcp(9243));
    ElasticSearchEndpointSG.connections.allowFrom(tarjontaPulssiUpdaterSg, Port.tcp(443));
    PostgreSQLSG.connections.allowFrom(tarjontaPulssiUpdaterSg, Port.tcp(5432));

    // Stack - level outputs
    new CfnOutput(this, "cloudfronturl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new CfnOutput(this, "ApiUrl", { value: dbApi.apiEndpoint });
    new CfnOutput(this, "accesslogbucket", { value: accessLogBucket.bucketName });
    new CfnOutput(this, "athenadatabase", { value: logsDatabase.databaseName });
    new CfnOutput(this, "athenaworkgroup", { value: logsWorkGroup.name });
    if (customDomain) {
      new CfnOutput(this, "customurl", { value: `https://${customDomain.domainName}` });
    }
  }
}
