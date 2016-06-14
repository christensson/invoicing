#!/bin/bash

function usage {
    echo "Step version: major.minor.revision"
    echo "Options:"
    echo "-1 Step major"
    echo "-2 Step minor"
    echo "-3 Step revision"
    exit
}
# Version format: major.minor.revision
INC_MAJOR=0
INC_MINOR=0
INC_REVISION=0

while getopts 123 opt; do
  case $opt in
    1)
      INC_MAJOR=1
      ;;
    2)
      INC_MINOR=1
      ;;
    3)
      INC_REVISION=1
      ;;
    \?)
      usage
      ;;
  esac
done

GITROOT=$(git rev-parse --show-toplevel)
PKG_FILE=$GITROOT/package.json

CURRENT_VERSION=$(grep version $PKG_FILE|cut -d\" -f4)
echo Current version: $CURRENT_VERSION

MAJOR=$(echo $CURRENT_VERSION|cut -d\. -f1)
MINOR=$(echo $CURRENT_VERSION|cut -d\. -f2)
REVISION=$(echo $CURRENT_VERSION|cut -d\. -f3)

if [ $INC_MAJOR -eq 1 ]; then
    echo "Increment major (+1.0.0)"
    MAJOR=$(echo "${MAJOR}+1"|bc)
    MINOR=0
    REVISION=0
elif [ $INC_MINOR -eq 1 ]; then
    echo "Increment minor (x.+1.0)"
    MINOR=$(echo "${MINOR}+1"|bc)
    REVISION=0
elif [ $INC_REVISION -eq 1 ]; then
    echo "Increment revision (x.x.+1)"
    REVISION=$(echo "${REVISION}+1"|bc)
fi

NEW_VERSION="$MAJOR.$MINOR.$REVISION"
echo New version: $NEW_VERSION

ENEW_VERSION=$(echo $NEW_VERSION|sed 's/\./\\\./g')
ECURRENT_VERSION=$(echo $CURRENT_VERSION|sed 's/\./\\\./g')
sed -i "s/$ECURRENT_VERSION/$ENEW_VERSION/" $PKG_FILE
echo
git diff $PKG_FILE



