import { StackContext, RemixSite, } from "sst/constructs";
import { Vpc, SubnetType } from "aws-cdk-lib/aws-ec2";
// import { Fn } from "aws-cdk-lib";




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

  console.log("OPHHostedZone value was: " + OPHhostedZone)
  console.log("OPHdomainName value was: " + OPHdomainName)

  const vpc = Vpc.fromLookup(stack, "myVPC", {
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


// Remix site
  const site = new RemixSite(stack, "site", {
    customDomain: {
      domainName: OPHdomainName, 
      hostedZone: OPHhostedZone,
    },
    cdk: {
      server: {
        vpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        }
      }
    }
  });

  

  stack.addOutputs({
    cloudfronturl: site.url,
    customurl: site.customDomainUrl
  });
};