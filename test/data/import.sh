#!/bin/bash

pushd ./provision

mongosh ./environment.js
mongosh ./oauth.js
mongosh ./product.js
mongosh ./tenant.js
mongosh ./resources.js
mongosh ./customRegistry.js

popd