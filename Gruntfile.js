/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

'use strict';


const fs = require('fs');
const path = require('path');

let lib = {
	/**
	 * Function that find the root path where grunt plugins are installed.
	 *
	 * @method findRoot
	 * @return String rootPath
	 */
	findRoot: function () {
		let cwd = process.cwd();
		let rootPath = cwd;
		let newRootPath = null;
		while (!fs.existsSync(path.join(process.cwd(), "node_modules/grunt"))) {
			process.chdir("..");
			newRootPath = process.cwd();
			if (newRootPath === rootPath) {
				return;
			}
			rootPath = newRootPath;
		}
		process.chdir(cwd);
		return rootPath;
	},
	/**
	 * Function load the npm tasks from the root path
	 *
	 * @method loadTasks
	 * @param grunt {Object} The grunt instance
	 * @param tasks {Array} Array of tasks as string
	 */
	loadTasks: function (grunt, rootPath, tasks) {
		tasks.forEach(function (name) {
			if (name === 'grunt-cli') return;
			let cwd = process.cwd();
			process.chdir(rootPath); // load files from proper root, I don't want to install everything locally per module!
			grunt.loadNpmTasks(name);
			process.chdir(cwd);
		});
	}
};

module.exports = function (grunt) {
	//Loading the needed plugins to run the grunt tasks
	let pluginsRootPath = lib.findRoot();
	lib.loadTasks(grunt, pluginsRootPath, ['grunt-contrib-jshint', 'grunt-jsdoc', 'grunt-contrib-clean', 'grunt-mocha-test', 'grunt-env'
		, 'grunt-istanbul', 'grunt-coveralls', 'grunt-babel', 'grunt-contrib-copy']);
	grunt.initConfig({
		babel: {
			options: {
				sourceMap: true,
				presets: ['@babel/preset-env'],
				plugins: ["@babel/plugin-transform-runtime"],
			},
			dist: {
				files: [{
					"expand": true,
					"src": [
						'test/**/*.js', 'test/*.js', 'test/unit/*.js', 'test/unit/**/*.js', 'test/unit/***/**/*.js',
						'*.js', 'container/**/*.js', 'infra/*.js', 'infra/**/*.js',
						'infra/***/**/*.js', 'lib/*.js', 'lib/**/*.js', 'lib/***/**/*.js', 'lib/****/***/**/*.js'
					],
					"dest": "dist/"
				}]
			}
		},
		
		//Defining jshint tasks
		jshint: {
			options: {
				"bitwise": true,
				"curly": true,
				"eqeqeq": true,
				"eqnull": true,
				"esversion": 6,
				"forin": true,
				"latedef": "nofunc",
				"leanswitch": true,
				"maxerr": 100,
				"noarg": true,
				"nonbsp": true,
				"strict": "global",
				"undef": true,
				"unused": true,
				"varstmt": true,
				
				//"validthis": true,
				//"loopfunc": true,
				//"sub": true,
				//"supernew": true,
				
				"node": true,
				
				"globals": {
					"describe": false,
					"it": false,
					"before": false,
					"beforeEach": false,
					"after": false,
					"afterEach": false
				}
			},
			files: {
				src: ['index.js', 'config.js', 'Gruntfile.js', 'soajs.core/**/*.js', 'soajs.es/**/*.js', 'soajs.mail/**/*.js', 'soajs.mongo/**/*.js', 'soajs.mongoStore/**/*.js', 'soajs.provision/**/*.js']
			},
			gruntfile: {
				src: 'Gruntfile.js'
			}
		},
		// jsdoc: {
		//   doc : {
		//     src: ['soajs/**/*.js'],
		//     jsdoc: pluginsRootPath+'/node_modules/grunt-jsdoc/node_modules/jsdoc/jsdoc',
		//     options: {
		//       dest: 'doc',
		//     }
		//   }
		// },
		
		env: {
			mochaTest: {
				SOAJS_ENV: "dev",
				SOAJS_PROFILE: __dirname + "/profiles/single.js",
				APP_DIR_FOR_CODE_COVERAGE: '../'
			},
			coverage: {
				SOAJS_ENV: "dev",
				SOAJS_PROFILE: __dirname + "/profiles/single.js",
				APP_DIR_FOR_CODE_COVERAGE: '../test/coverage/instrument/'
			}
		},
		
		clean: {
			doc: {
				src: ['doc/']
			},
			coverage: {
				src: ['test/coverage/']
			}
		},
		
		instrument: {
			files: ['index.js', 'soajs.contentBuilder/**/*.js', 'soajs.core/**/*.js', 'soajs.es/**/*.js', 'soajs.mail/**/*.js', 'soajs.mail/**/*.js', 'soajs.mongo/**/*.js', 'soajs.mongoStore/**/*.js', 'soajs.provision/**/*.js'],
			//files: ['**/*.js'],
			options: {
				lazy: false,
				basePath: 'test/coverage/instrument/'
			}
		},
		
		storeCoverage: {
			options: {
				dir: 'test/coverage/reports'
			}
		},
		
		makeReport: {
			src: 'test/coverage/reports/**/*.json',
			options: {
				type: 'lcov',
				dir: 'test/coverage/reports',
				print: 'detail'
			}
		},
		
		mochaTest: {
			unit: {
				options: {
					reporter: 'spec',
					timeout: 90000
				},
				src: ['test/unit/_servers.test.js']
			},
			integration: {
				options: {
					reporter: 'spec',
					timeout: 90000
				},
				src: ['test/integration/*.js']
			}
		},
		
		coveralls: {
			options: {
				// LCOV coverage file relevant to every target
				src: 'test/coverage/reports/lcov.info',
				
				// When true, grunt-coveralls will only print a warning rather than
				// an error, to prevent CI builds from failing unnecessarily (e.g. if
				// coveralls.io is down). Optional, defaults to false.
				force: false
			},
			your_target: {
				// Target-specific LCOV coverage file
				src: 'test/coverage/reports/lcov.info'
			}
		}
	});
	
	process.env.SHOW_LOGS = grunt.option('showLogs');
	grunt.registerTask("default", ['jshint']);
	grunt.registerTask("integration", ['env:mochaTest', 'mochaTest:integration']);
	grunt.registerTask("unit", ['env:mochaTest', 'mochaTest:unit']);
	grunt.registerTask("test", ['clean', 'env:coverage', 'instrument', 'mochaTest:unit', 'mochaTest:integration', 'storeCoverage', 'makeReport']);
	grunt.registerTask("coverage", ['clean', 'env:coverage', 'instrument', 'mochaTest:unit', 'mochaTest:integration', 'storeCoverage', 'makeReport', 'coveralls']);
	
};

