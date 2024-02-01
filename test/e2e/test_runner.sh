#!/bin/bash

set -eu

chtCoreDockerComposeFile='cht-docker-compose.sh'
chtCoreDockerComposeUrl='https://raw.githubusercontent.com/medic/cht-core/master/scripts/docker-helper-4.x/cht-docker-compose.sh'
chtCoreProjectName='cht_conf_e2e_tests'
chtConfe2eFolderName='e2e_tests'
currentDir=$(pwd)

log_info() {
  echo "[INFO] $1"
}

log_error() {
  echo "[ERROR] $1"
}

setup() {
  log_info "Starting cht-conf e2e tests"

  mkdir -p "$chtConfe2eFolderName"
  cd "$chtConfe2eFolderName"

  log_info "Setting up cht-core"

  curl -s -o "$chtCoreDockerComposeFile" "$chtCoreDockerComposeUrl"
  chmod +x "$chtCoreDockerComposeFile"

  if {
    echo "y"
    echo "y"
    echo "$chtCoreProjectName"
  } | ./"$chtCoreDockerComposeFile"; then
    log_info "cht-core setup complete."
  else
    log_error "Failed to set up cht-core. Manual cleanup may be required. Exiting."
    exit 1
  fi

  # since the setup is completed if the execution flow
  # reaches here, this makes sure that the destruction of
  # the setup always occurs
  trap destroy EXIT
  trap destroy ERR
}

run_tests() {
  log_info "Running e2e tests"

  nyc --reporter=html mocha --forbid-only "../test/e2e/**/*.spec.js"

  log_info "e2e tests complete"
}

destroy() {
  log_info "Destroying cht-core."

  if ./"$chtCoreDockerComposeFile" "$chtCoreProjectName.env" destroy; then
    log_info "cht-core destroy complete. Exiting."
  else
    log_error "Failed to destroy cht-core. Manual cleanup may be required."
  fi

  cd "$currentDir"
  rm -rf "$chtConfe2eFolderName"
}

setup

run_tests
