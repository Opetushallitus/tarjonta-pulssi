#!/bin/sh

docker run --add-host=host.docker.internal:host-gateway --rm -v $(pwd)/test/resources/elasticdump:/tmp elasticdump/elasticsearch-dump \
multielasticdump --direction=load --input=/tmp --output=$1 --includeType=$2
