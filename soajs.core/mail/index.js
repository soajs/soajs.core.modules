"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

let validator = new (require("../validator/").Validator)();
let config = require('./config');
let nodemailer = require("nodemailer");
// let nodemailerSmtpTransport = require('nodemailer-smtp-transport');
// let nodemailerSendmailTransport = require('nodemailer-sendmail-transport');

let mailer = function (configuration) {
	let transport;
	
	//if no conf, switch to direct transport driver with default options
	if (!configuration) {
		transport = config.transport.default.options;
	} else {
		//if no type nor options, throw error
		let x = validator.validate(configuration, config.schema.transport);
		if (x.errors && x.errors.length > 0) {
			let err = [];
			for (let m = 0; m < x.errors.length; m++) {
				let xsm = "'" + x.errors[m].property.replace('instance.', '') + "'";
				xsm += ' ' + x.errors[m].message;
				err.push(xsm);
			}
			throw new Error("transport error: " + err.join(" - "));
		}
		
		//check type and use corresponding transport driver
		switch (configuration.type.toLowerCase()) {
			case 'smtp':
				transport = configuration.options;
				break;
			default:
			// case 'sendmail':
				transport = configuration.options;
				transport.sendmail = true;
				break;
			// default:
			// 	nodeMailerDirectTransport = require('nodemailer-direct-transport');
			// 	transport = nodeMailerDirectTransport(configuration.options);
			// 	break;
		}
	}
	
	//initialize the transporter with driver from above
	this.transporter = nodemailer.createTransport(transport);
};

mailer.prototype.send = function (mailOptions, callback) {
	let x = validator.validate(mailOptions, config.schema.mailOptions);
	if (x.errors && x.errors.length > 0) {
		let err = [];
		for (let m = 0; m < x.errors.length; m++) {
			let xsm = "'" + x.errors[m].property.replace('instance.', '') + "'";
			xsm += ' ' + x.errors[m].message;
			err.push(xsm);
		}
		return callback(new Error("mailOptions error: " + err.join(" - ")));
	}
	
	//tell the driver to send the mail
	this.transporter.sendMail(mailOptions, callback);
};

module.exports = mailer;
