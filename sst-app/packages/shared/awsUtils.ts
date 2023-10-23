// Käytetään lambda-ympäristön aws-sdk:a. Ei toimi ESM-importilla, joten täytyy käyttää requirea
/* eslint-disable @typescript-eslint/no-var-requires */
const AWS = require("aws-sdk");
const ssm = new AWS.SSM();

export async function getSSMParam(param?: string) {
  if (param == null) {
    return undefined;
  }
  try {
    const result = await ssm
      .getParameter({
        Name: param,
        WithDecryption: true,
      })
      .promise();
    return result.Parameter?.Value;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}