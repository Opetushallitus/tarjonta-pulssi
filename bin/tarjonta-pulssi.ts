#!/usr/bin/env node
import { App } from "aws-cdk-lib";

import { CertificateStack } from "../stacks/certificate";
import { TarjontaPulssiStack } from "../stacks/tarjonta-pulssi";

const STAGES = {
  untuva: { hostedZone: "untuvaopintopolku.fi" },
  hahtuva: { hostedZone: "hahtuvaopintopolku.fi" },
  pallero: { hostedZone: "testiopintopolku.fi" },
  sade: { hostedZone: "opintopolku.fi" },
} as const;

type StageName = keyof typeof STAGES;

const isStage = (value: unknown): value is StageName =>
  typeof value === "string" && value in STAGES;

const app = new App();

const stage: unknown = app.node.tryGetContext("stage");
if (!isStage(stage)) {
  throw new Error(
    `Unknown stack environment (stage) "${String(stage)}"! ` +
      `Anna ympäristö kontekstina, esim. \`cdk deploy --all -c stage=untuva\`. ` +
      `Sallitut arvot: ${Object.keys(STAGES).join(", ")}.`
  );
}

// `-c skipDomain=true` deployaa ilman omaa domainia. Tarvitaan kerran ympäristöä
// kohden SST:stä siirryttäessä, ks. README.
const skipDomain = String(app.node.tryGetContext("skipDomain")) === "true";

const { hostedZone } = STAGES[stage];
const domainName = `tarjonta-pulssi.${hostedZone}`;
const account = process.env.CDK_DEFAULT_ACCOUNT;

// Stackin nimi on sama kuin SST:n luoman stackin, jotta deploy päivittää
// olemassa olevan stackin eikä luo rinnakkaista.
const stackPrefix = `${stage}-tarjonta-pulssi-app`;

const certificateStack = skipDomain
  ? undefined
  : new CertificateStack(app, `${stackPrefix}-CERT`, {
      env: { account, region: "us-east-1" },
      crossRegionReferences: true,
      hostedZoneName: hostedZone,
      domainName,
    });

new TarjontaPulssiStack(app, `${stackPrefix}-TARJONTAPULSSI`, {
  env: { account, region: "eu-west-1" },
  crossRegionReferences: true,
  stage,
  publicHostedZone: hostedZone,
  customDomain: certificateStack && {
    domainName,
    hostedZoneName: hostedZone,
    certificate: certificateStack.certificate,
  },
});
