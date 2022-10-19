#!/usr/bin/env bash

set -eo pipefail

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
  environment           Environment name (e.g. pallero)

optional arguments:
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
    echo "Installing CDK dependencies.."
    cd "${git_root}/cdk/" && npm ci
    echo "Installing app dependencies.."
    cd "${git_root}/app/" && npm ci
fi

environment=${POSITIONAL[-1]}
## Profiles are defined in user's .aws/config
if [[ "${environment}" =~ ^(sade)$ ]]; then
    aws_profile="oph-prod"
    r53_domain="opintopolku.fi"
    hosted_zone_id="ZNMCY72OCXY4M"
elif [[ "${environment}" =~ ^(untuva)$ ]]; then
    aws_profile="oph-dev"
    r53_domain="${environment}opintopolku.fi"
    hosted_zone_id="Z1399RU36FG2N9"
elif [[ "${environment}" =~ ^(hahtuva)$ ]]; then
    aws_profile="oph-dev"
    r53_domain="${environment}opintopolku.fi"
    hosted_zone_id="Z20VS6J64SGAG9"
elif [[ "${environment}" =~ ^(pallero)$ ]]; then
    aws_profile="oph-dev"
    r53_domain="testiopintopolku.fi"
    hosted_zone_id="Z175BBXSKVCV3B"
else 
    echo "Unknown environment: ${environment}"
    exit 0
fi


if [[ "${build}" == "true" ]]; then
    echo "Building Lambda code and synthesizing CDK template"
    cd "${git_root}/app/"
    npm run build
    cd "${git_root}/cdk/"
    npm run build
    npx cdk synth
fi

if [[ "${deploy}" == "true" ]]; then
   echo "Building Lambda code, synhesizing CDK code and deploying to environment: $environment"
   cd "${git_root}/app/"
   npm run build
   cd "${git_root}/cdk/"
   npm run build
   npx cdk synth
   npx cdk deploy -c "environment=$environment" -c "publichostedzone=$r53_domain" -c "publichostedzoneid=$hosted_zone_id" --profile "$aws_profile"
fi
