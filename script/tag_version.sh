#!/bin/bash

function usage {
    echo "$0 tag"
    exit
}

TAG_PREFIX=$1

if [[ "$TAG_PREFIX" == "" ]]; then
    echo "No tag prefix!"
    usage
fi

GITROOT=$(git rev-parse --show-toplevel)
PKG_FILE=$GITROOT/package.json

CURRENT_VERSION=$(grep version $PKG_FILE|cut -d\" -f4)
TAG=${TAG_PREFIX}${CURRENT_VERSION}
echo Tag: $TAG
git tag $TAG



