import { SSM } from "@aws-sdk/client-ssm";

const ssm = new SSM();

export async function getSSMParam(param?: string) {
  if (param == null) {
    return undefined;
  }
  try {
    const result = await ssm.getParameter({
      Name: param,
      WithDecryption: true,
    });
    return result.Parameter?.Value;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}
