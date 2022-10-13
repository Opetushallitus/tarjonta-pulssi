import type { PutObjectRequest } from "aws-sdk/clients/s3";

// Käytetään lambda-ympäristön aws-sdk:a. Ei toimi ESM-importilla, joten täytyy käyttää requirea
/* eslint-disable @typescript-eslint/no-var-requires */
const AWS = require("aws-sdk");

const s3 = new AWS.S3();
const ssm = new AWS.SSM();
const lambda = new AWS.Lambda();

export function putPulssiS3Object(params: Omit<PutObjectRequest, "Bucket">) {
  return s3
    .putObject({
      ...params,
      Bucket: `tarjonta-pulssi.${process.env.PUBLICHOSTEDZONE}`,
    })
    .promise();
}

export function invokeViewerLambda() {
  return lambda
    .invoke({
      FunctionName: process.env.VIEWER_LAMBDA_NAME,
      InvocationType: "Event",
      LogType: "Tail",
      Payload: null,
    })
    .promise();
}

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