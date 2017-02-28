module.exports = function (grunt) {

  require("load-grunt-tasks")(grunt);

  // Project configuration.
  grunt.initConfig({
    "shell": {
      "lab": {
        "command": "./node_modules/.bin/lab -I regeneratorRuntime,Observable,__core-js_shared__,core,System," +
        "_babelPolyfill,asap -S -r console -m 4000 -o stdout -r html -o coverage.html 'test-dist'"
      },
      "labTeamCity": {
        "command": "./node_modules/.bin/lab -I regeneratorRuntime,Observable,__core-js_shared__,core,System," +
        "_babelPolyfill,asap -S -r './node_modules/lab-teamcity-reporter/src/teamcity.js'" +
        " -m 4000 -o stdout -r html -o coverage.html 'test-dist'"
      }
    },
    "babel": {
      "options": {
        "sourceMap": "inline",
        "presets": [["env", {"targets": {"node": "current"}}]]
      },
      "dist": {
        "files": [{
          "expand": true,
          "cwd": "lib/",
          "src": ["**/*.es6"],
          "dest": "dist/",
          "ext": ".js"
        }]
      },
      "test-dist": {
        "files": [{
          "expand": true,
          "cwd": "test-lib/",
          "src": ["**/*.spec.es6"],
          "dest": "test-dist/",
          "ext": ".spec.js"
        }, {
          "expand": true,
          "cwd": "test-lib/",
          "src": ["**/*.helper.es6"],
          "dest": "test-dist/",
          "ext": ".helper.js"
        }]
      }
    },
    "clean": [
      "dist",
      "test-dist"
    ],
    "eslint": {
      "target": [
        "lib/**/*.es6",
        "test-lib/**/*.spec.es6",
        "test-lib/**/*.helper.es6",
        "Gruntfile.js"
      ],
      "options": {
        "configFile": ".eslintrc"
      }
    },
    "watch": {
      "es6": {
        "files": [
          "lib/**/*.es6",
          "test-lib/**/*.spec.es6",
          "test-lib/**/*.helper.es6",
          "Gruntfile.js"
        ],
        "tasks": ["babel"]
      }
    }
  });

  // Default task.
  grunt.registerTask("default", [
    "buildCommon",
    "testCommon"
  ]);

  // Common build task
  grunt.registerTask("buildCommon", [
    "clean",
    "babel",
    "eslint"
  ]);

  // Common test task
  grunt.registerTask("testCommon", [
    "shell:lab"
  ]);

  // TeamCity build task
  grunt.registerTask("buildTeamCity", [
    "buildCommon"
  ]);

  // TeamCity test task
  grunt.registerTask("testTeamCity", [
    "shell:labTeamCity"
  ]);
};
