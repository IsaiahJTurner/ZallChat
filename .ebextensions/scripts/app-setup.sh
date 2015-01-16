#!/bin/bash

export ELASTICBEANSTALK_APP_DIR="/$ELASTICBEANSTALK_APP_NAME"
  
dirApp="$ELASTICBEANSTALK_APP_DIR"

# Create tmp directory
mkdir -p $dirApp/tmp
  
# Set permissions
chmod 777 $dirApp
chmod 777 $dirApp/tmp
chown nodejs $dirApp/tmp

# Ensuring all the required environment settings after all the above setup
if ([ -f ~/.bash_profile ]) then
    source ~/.bash_profile
fi

# Always successful exit so that beanstalk does not stop creating the environment
exit 0