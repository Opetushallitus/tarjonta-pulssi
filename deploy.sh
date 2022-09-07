#!/usr/bin/env bash

set -xeo pipefail

if [ $# == 0  ] || [ $# -gt 3 ] 
then
    echo 'please provide 1-3 arguments. Use -h or --help for usage information.'
    exit 0
fi

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"
case $key in
    -h | --help | help )
    echo '''
Usage: cdk.sh [-h] [-d] environment deploy/build

Light weight version of cdk.sh in cloud-base 

positional arguments:
  deploy                builds and deploys the stack to target environment. Environment must be supplied.
  build                 only builds the Lambda & synthesizes CDK (useful when developing)

optional arguments:
environment           Environment name (e.g. pallero)
  -h, --help            Show this help message and exit
  -d, --dependencies    Clean and install dependencies before deployment (i.e. run npm ci)
  '''
    exit 0
    ;;

    -d | --dependencies)
    dependencies="true"
    shift
    ;;

    build)
    build="true"
    shift
    ;;

    deploy)
    deploy="true"
    shift
    ;;

    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done

git_root=$(git rev-parse --show-toplevel)



if [[ -n "${dependencies}" ]]; then
    echo "Installing dependencies"
    cd "${git_root}/cdk/" && npm ci
fi

if [[ "${build}" == "true" ]]; then
    echo "Building Lambda code and synthesizing CDK template"
    cd "${git_root}/cdk/"
    npm run build
    npx cdk synth
fi

if [[ "${deploy}" == "true" ]]; then
    environment=${POSITIONAL[0]}
    ## Profiles are defined in user's .aws/config
    if [[ "${environment}" =~ ^(sade)$ ]]; then
        aws_profile="oph-prod"
        r53_domain="opintopolku.fi"
    elif  [[ "${environment}" =~ ^(sieni|hahtuva|untuva)$ ]]; then
        aws_profile="oph-dev"
        r53_domain="${environment}opintopolku.fi"
        elif  [[ "${environment}" =~ ^(pallero)$ ]]; then
        aws_profile="oph-dev"
        r53_domain="testiopintopolku.fi"
    else 
        echo "Unknown environment: ${environment}"
        exit 1
    fi


   echo "Building Lambda code, synhesizing CDK code and deploying to environment: $environment"
   cd "${git_root}/cdk/"
   npm run build
   npx cdk synth
   npx cdk deploy -c "environment=$environment" -c "publichostedzone=$r53_domain" --profile "$aws_profile"
fi
