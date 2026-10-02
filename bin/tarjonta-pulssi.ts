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
    [
      `Unknown stack environment (stage) "${String(stage)}"!`,
      `Anna ympäristö kontekstina, esim. \`pnpm run cdk:deploy -c stage=untuva\`.`,
      `Sallitut arvot: ${Object.keys(STAGES).join(", ")}.`,
      "",
      "Jos annoit sen jo, tarkista ettet käyttänyt `--`-erotinta: pnpm välittää sen",
      "eteenpäin, ja CDK:n argumenttijäsennin lopettaa valitsimien lukemisen siihen,",
      "jolloin `-c` jää huomiotta. Oikein: `pnpm run cdk:deploy -c stage=untuva`.",
    ].join("\n")
  );
}

// `-c skipDomain=true` deployaa ilman omaa domainia. Tarvitaan kerran ympäristöä
// kohden SST:stä siirryttäessä, ks. README.
const skipDomain = String(app.node.tryGetContext("skipDomain")) === "true";

const { hostedZone } = STAGES[stage];
const domainName = `tarjonta-pulssi.${hostedZone}`;

// CDK täyttää tämän aktiivisesta AWS-sessiosta. Ilman sitä stackin ympäristö jäisi
// määrittelemättä, ja vika ilmenisi vasta VPC-haussa vaikeasti tulkittavana
// virheenä — myös silloin kun syy on pelkkä kirjoitusvirhe profiilin nimessä.
const account = process.env.CDK_DEFAULT_ACCOUNT;
if (!account) {
  const profile = stage === "sade" ? "oph-prod" : "oph-dev";
  throw new Error(
    [
      "AWS-tiliä ei saatu ratkaistua (CDK_DEFAULT_ACCOUNT on tyhjä).",
      "",
      "Komento on ajettava voimassa olevilla tunnuksilla, esim:",
      `  pnpm run cdk:deploy -c stage=${stage} --profile ${profile}`,
      "",
      "tai aws-vault-session sisällä (ei kysy MFA-koodia toistuvasti):",
      `  aws-vault exec ${profile}`,
      `  pnpm run cdk:deploy -c stage=${stage}`,
      "",
      "Huom. että CDK ei valita olemattomasta tai vanhentuneesta profiilista —",
      "se jättää tilin vain tyhjäksi, joten tarkista myös profiilin nimi.",
    ].join("\n")
  );
}

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
