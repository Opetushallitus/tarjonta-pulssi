import { StackContext, RemixSite } from "sst/constructs";

export function TARJONTAPULSSI({ stack }: StackContext) {
  const site = new RemixSite(stack, "site");
  stack.addOutputs({
    url: site.url,
  });
};