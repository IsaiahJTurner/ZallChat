#!/bin/bash

# Check if this is the very first time that this script is running
if ([ ! -f /root/.not-a-new-instance.txt ]) then
    newEC2Instance=true
fi
  
  
  
# Get the directory of 'this' script
dirCurScript=$(dirname "${BASH_SOURCE[0]}")
  
# Fix the line endings of all files
find $dirCurScript/../../ -type f | xargs dos2unix -q -k
  
# Get the app configuration environment variables
source $dirCurScript/../../copy-to-slash/root/.elastic-beanstalk-app
export ELASTICBEANSTALK_APP_DIR="/$ELASTICBEANSTALK_APP_NAME"
  
appName="$ELASTICBEANSTALK_APP_NAME"
dirApp="$ELASTICBEANSTALK_APP_DIR"
  
dirAppExt="$ELASTICBEANSTALK_APP_DIR/.ebextensions"
dirAppTmp="$ELASTICBEANSTALK_APP_DIR/tmp"
  
dirAppData="$dirAppExt/data"
dirAppScript="$dirAppExt/scripts"
  
  
# Create tmp directory
mkdir -p $dirApp/tmp
  
# Set permissions
chmod 777 $dirApp
chmod 777 $dirApp/tmp

# Ensuring all the required environment settings after all the above setup
if ([ -f ~/.bash_profile ]) then
    source ~/.bash_profile
fi

# If new instance, now it is not new anymore
if ([ $newEC2Instance ]) then
    echo -n "" > /root/.not-a-new-instance.txt
fi
  
  
# Print the finish time of this script
echo $(date)
  
  
# Always successful exit so that beanstalk does not stop creating the environment
exit 0