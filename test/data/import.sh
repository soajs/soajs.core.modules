#!/bin/bash

pushd ./provision
mongo ./environment.js
mongo ./oauth.js
mongo ./product.js
mongo ./tenant.js
mongo ./resources.js
mongo ./customRegistry.js
popd