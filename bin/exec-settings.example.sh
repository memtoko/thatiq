#!/usr/bin/env bash

# This is default settings for exec file used inside Vagrant,
# copy this file and change the value to "exec-settings.sh"
# for other environment.
NODE_BIN="/home/vagrant/.nvm/versions/node/v8.11.3/bin"
NPM_BIN=$(readlink -f "./node_modules/.bin")
