"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const fs = require('fs');
let core = require("../soajs.core");
let validator = new core.validator.Validator();

let config = require("./config");
let handlebars = null;

let mailer = function (config) {
	handlebars = require("handlebars");
	this.mail = new core.getMail(config);
};

mailer.prototype.renderTemplate = function (mailOptions) {
	let tmplPath = (mailOptions.path) ? fs.readFileSync(mailOptions.path, {'encoding': 'utf8'}) : mailOptions.content;
	
	let template = handlebars.compile(tmplPath);
	mailOptions.html = template(mailOptions.data);
	mailOptions.text = mailOptions.html.replace(/(<([^>]+)>)/ig, "");//strip tags
	
	delete mailOptions.content;
	delete mailOptions.data;
};

mailer.prototype.send = function (mailOptions, callback) {
	if (!mailOptions.data) {
		mailOptions.data = {};
	}
	if (mailOptions.content || mailOptions.path) {
		this.renderTemplate(mailOptions);
	}
	
	let x = validator.validate(mailOptions, config.schema);
	if (x.errors && x.errors.length > 0) {
		let err = [];
		for (let m = 0; m < x.errors.length; m++) {
			let xsm = "'" + x.errors[m].property.replace('instance.', '') + "'";
			xsm += ' ' + x.errors[m].message;
			err.push(xsm);
		}
		return callback(new Error("soajs.mail error: " + err.join(" - ")));
	}
	
	this.mail.send(mailOptions, callback);
};

module.exports = mailer;