import { Stack, type StackProps } from "aws-cdk-lib";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";

export interface CertificateStackProps extends StackProps {
  /** Route53-vyöhykkeen nimi, esim. `untuvaopintopolku.fi`. */
  hostedZoneName: string;
  /** Sivuston domain, esim. `tarjonta-pulssi.untuvaopintopolku.fi`. */
  domainName: string;
}

/**
 * CloudFront hyväksyy vain us-east-1 -alueella olevan sertifikaatin, joten se on
 * pakko luoda omassa stackissaan. Sovellusstack lukee arnin yli alueiden
 * (`crossRegionReferences`).
 */
export class CertificateStack extends Stack {
  readonly certificate: Certificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    const hostedZone = HostedZone.fromLookup(this, "HostedZone", {
      domainName: props.hostedZoneName,
    });

    this.certificate = new Certificate(this, "SiteCertificate", {
      domainName: props.domainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });
  }
}
