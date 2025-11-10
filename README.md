# soajs.core.modules

[![Build Status](https://travis-ci.org/soajs/soajs.core.modules.svg?branch=master)](https://travis-ci.org/soajs/soajs.core.modules)
[![Coverage Status](https://coveralls.io/repos/soajs/soajs.core.modules/badge.png)](https://coveralls.io/r/soajs/soajs.core.modules)
[![Known Vulnerabilities](https://snyk.io/test/github/soajs/soajs.core.modules/badge.svg)](https://snyk.io/test/github/soajs/soajs.core.modules)
[![npm version](https://badge.fury.io/js/soajs.core.modules.svg)](https://www.npmjs.com/package/soajs.core.modules)

Core modules package for the SOAJS framework, providing essential utilities for logging, database connectivity, email, security, provisioning, and validation.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Available Modules](#available-modules)
- [Usage](#usage)
  - [Core Module](#core-module)
  - [MongoDB Module](#mongodb-module)
  - [MongoDB Store Module](#mongodb-store-module)
  - [Mail Module](#mail-module)
  - [Provision Module](#provision-module)
  - [Hasher Utility](#hasher-utility)
  - [Authorization Utility](#authorization-utility)
- [Testing](#testing)
- [Documentation](#documentation)
- [License](#license)

## Overview

The `soajs.core.modules` package provides a collection of essential modules used throughout the SOAJS (Service Oriented Architecture JavaScript) framework. These modules handle common tasks such as database operations, email delivery, security, provisioning, and validation.

## Installation

```bash
npm install soajs.core.modules
```

## Available Modules

The package exports the following modules:

| Module | Description |
|--------|-------------|
| `core` | Core utilities including logging, error handling, security, validation, and key management |
| `mongo` | MongoDB database connection and operations |
| `mongoStore` | MongoDB-backed session store for Express |
| `mail` | Email delivery service |
| `provision` | Provisioning utilities for SOAJS services |
| `hasher` | Password hashing utilities |
| `authorization` | Authorization token generation |

## Usage

### Core Module

The core module provides essential utilities including logging, error handling, security, validation, and metadata management.

```javascript
const soajsModules = require('soajs.core.modules');

// Get a logger instance
const logger = soajsModules.core.getLogger('myService', { level: 'info' });
logger.info('Service started');

// Error handling
const errorHandler = soajsModules.core.error;

// Key management
const keyManager = soajsModules.core.key;

// Validator
const validator = soajsModules.core.validator;
const isValid = validator.validate(data, schema);

// Get host IP address
soajsModules.core.getHostIp((result) => {
    if (result.result) {
        console.log('Host IP:', result.ip);
    }
});

// Security features
const security = soajsModules.core.security;
```

### MongoDB Module

Provides MongoDB database connectivity and operations for SOAJS services.

```javascript
const mongo = soajsModules.mongo;

// Initialize MongoDB connection
mongo.init(config, (err) => {
    if (err) {
        console.error('Failed to connect to MongoDB:', err);
        return;
    }

    // Perform database operations
    mongo.find('collectionName', { query: {} }, (err, records) => {
        if (err) {
            console.error('Query failed:', err);
            return;
        }
        console.log('Records:', records);
    });
});
```

### MongoDB Store Module

MongoDB-backed session store for Express applications.

```javascript
const mongoStore = soajsModules.mongoStore;
const session = require('express-session');

app.use(session({
    store: mongoStore.create({
        mongooseConnection: connection,
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
```

### Mail Module

Email delivery service supporting various transport methods.

```javascript
const mail = soajsModules.mail;

// Configure mail service
mail.init(mailConfig);

// Send email
mail.send({
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome to SOAJS',
    html: '<h1>Welcome!</h1><p>Thank you for joining.</p>'
}, (err, info) => {
    if (err) {
        console.error('Failed to send email:', err);
        return;
    }
    console.log('Email sent:', info.messageId);
});
```

### Provision Module

Handles provisioning configuration and management for SOAJS services.

```javascript
const provision = soajsModules.provision;

// Initialize provisioning
provision.init(config, (err) => {
    if (err) {
        console.error('Provisioning failed:', err);
        return;
    }

    // Get provisioning data
    const tenantData = provision.getTenant();
    const envData = provision.getEnvironment();
});
```

### Hasher Utility

Secure password hashing using bcrypt.

```javascript
const hasher = soajsModules.hasher;

// Hash a password
hasher.hash('myPassword', (err, hashedPassword) => {
    if (err) {
        console.error('Hashing failed:', err);
        return;
    }
    console.log('Hashed password:', hashedPassword);
});

// Compare password with hash
hasher.compare('myPassword', hashedPassword, (err, isMatch) => {
    if (err) {
        console.error('Comparison failed:', err);
        return;
    }
    console.log('Password matches:', isMatch);
});
```

### Authorization Utility

Generate authorization tokens for SOAJS services.

```javascript
const authorization = soajsModules.authorization;

// Generate authorization token
const token = authorization.generate({
    id: 'user123',
    tenant: 'tenant1',
    expires: Date.now() + (60 * 60 * 1000) // 1 hour
});

console.log('Authorization token:', token);
```

## Testing

Run the test suite:

```bash
npm test
```

The package uses Grunt with Mocha for testing and Istanbul for coverage reporting.

## Documentation

For detailed API documentation and usage guides, visit the [SOAJS Wiki](https://soajsorg.atlassian.net/wiki/spaces/SOAJ/overview).

## License

**Copyright SOAJS All Rights Reserved.**

Use of this source code is governed by an Apache license that can be found in the LICENSE file at the root of this repository.

