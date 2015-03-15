module.exports = function(grunt) {

  var

    defaultTasks = [
      // run grunt watch
      'watch'
    ],

    watchTasks = [
      // compiles less to docs
      'less:buildDocsCSS',

      // auto prefix doc files
      'autoprefixer:prefixFile',

      // copies assets and js over to docs
      'copy:srcToDocs',

      // copies examples over to docs
      'copy:examplesToDocs',

      // create concatenated css release
      'concat:createDocsCSSPackage',

      // create concatenated js release
      'concat:createDocsJSPackage'
    ],

    testWatchTasks = [
      'clear',
      'karma:watch:run'
    ],

    testTasks = [
      // compiles less to docs so phantomjs can read
      'less:buildTestCSS',

      // test components
      'karma:travis'
    ],

    resetTasks = [
      // clean build directory
      'clean:build',

      // cleans previous generated release
      'clean:release'
    ],

    releaseTasks = [
      // clean build directory
      'clean:build',

      // copies assets and js over to build dir
      'copy:srcToBuild',

      // compiles less
      'less:buildCSS',

      // auto prefix docs files
      'autoprefixer:prefixDocs',

      // auto prefix build files
      'autoprefixer:prefixBuild',

      // creates minified js of each file
      'uglify:minifyJS',

      // creates minified css of each file
      'cssmin:minifyCSS',

      // create concatenated css release
      'concat:createCSSPackage',

      // create concatenated js release
      'concat:createJSPackage',

      // creates release js of all together
      'uglify:createMinJSPackage',

      // creates custom license in header
      'cssmin:createMinCSSPackage',

      // cleans previous generated release
      'clean:release'

    ],

    rtlTasks = [
      // copies assets to rtl
      'copy:buildToRTL',

      // create rtl release
      'cssjanus:rtl'
    ],

    docTasks = [

      // copies examples over to docs
      'copy:examplesToDocs',

      // creates release zip
      'compress:everything',

      // copies files over to docs
      'copy:buildToDocs',

      // generate code docs
      'docco:generate',

      // copies spec files over to docs
      'copy:specToDocs'
    ],

    buildTasks = releaseTasks.concat(rtlTasks).concat(docTasks),

    setWatchTests = function(action, filePath) {
      var
        karmaFiles   = grunt.config('karma.watch.files'),
        isJavascript = (filePath.search('.js') !== -1),
        isModule     = (filePath.search('modules/') !== -1),
        isSpec       = (filePath.search('.spec') !== -1),
        specFile     = (isSpec)
          ? filePath
          : filePath
              .replace('src/', 'test/')
              .replace('.js', '.spec.js')
      ;
      if(isJavascript && (isSpec || isModule) ) {
        karmaFiles.pop();
        karmaFiles.push(specFile);
      }
    },

    setWatchFiles = function(action, filePath) {
      var
        buildPath = filePath.replace('src/', 'docs/build/uncompressed/').replace('less', 'css')
      ;
      if(filePath.search('.less') !== -1) {
        grunt.config('less.buildDocsCSS.src', filePath);
        grunt.config('less.buildDocsCSS.dest', buildPath);
        grunt.config('autoprefixer.prefixFile.src', buildPath);
      }
      else {
        grunt.config('less.buildDocsCSS.src', 'non/existant/path');
        grunt.config('less.buildDocsCSS.dest', 'non/existant/path');
        grunt.config('autoprefixer.prefixFile.src', 'non/existant/path');
      }
    },

    // this allows filenames with multiple extensions to be preserved
    preserveFileExtensions = function(folder, filename) {
      return folder + filename.substring(0, filename.lastIndexOf('.') ) + '.css';
    },
    preserveMinFileExtensions = function(folder, filename) {
      return folder + filename.substring(0, filename.lastIndexOf('.') ) + '.min.css';
    },

    config
  ;

  config = {

    package : grunt.file.readJSON('package.json'),

    /*******************************
                 Watch
    *******************************/

    // watches for changes in a source folder
    watch: {
      options: {
        spawn: false
      },
      scripts: {
        files: [
          'test/**/*.js',
          'src/**/*.js'
        ],
        tasks : testWatchTasks
      },
      src: {
        files: [
          'build/examples/**/*',
          'src/**/*.less',
          'src/**/*.js'
        ],
        tasks : watchTasks
      }
    },

    /*******************************
                  Test
    *******************************/

    clear: {
      terminal: {

      }
    },

    karma: {
      watch: {
        configFile : 'karma.conf.js',
        background : true
      },
      travis: {
        configFile : 'karma.conf.js',
        singleRun  : true
      }
    },

    /*******************************
                Build
    *******************************/
    autoprefixer: {
      options: {
        browsers: [
          'last 2 version',
          '> 1%',
          'opera 12.1',
          'safari 6',
          'ie 9',
          'bb 10',
          'android 4'
        ]
      },
      prefixBuild: {
        expand : true,
        cwd    : 'build/',
        dest   : 'build/',
        src    : [
          '**/*.less',
          '**/*.css',
        ]
      },
      prefixDocs: {
        expand : true,
        cwd    : 'docs/build/',
        dest   : 'docs/build/',
        src    : [
          '**/*.less',
          '**/*.css',
        ]
      },
      prefixFile: {
        src : 'docs/build/**/*.css'
      }
    },

    clean: {
      options: {
        force: true
      },
      build : [
        'build/less',
        'build/minified',
        'build/packaged',
        'build/uncompressed'
      ],
      release : [
        'docs/build',
        'rtl'
      ]
    },

    docco: {
      generate: {
        options: {
          css    : 'spec/assets/docco.css',
          output : 'spec/docs/'
        },
        files: [
          {
            expand : true,
            cwd    : 'spec/',
            src    : [
              '**.commented.js'
            ]
          }
        ]
      }
    },

    cssjanus: {
      rtl: {
        expand : true,
        cwd    : 'build/',
        src    : [
          '**/*.less',
          '**/*.css',
        ],
        dest   : 'rtl'
      },
    },

    less: {

      options: {
        paths        : ['src'],
        compress     : false,
        optimization : 2
      },

      // optimized for watch, src is built on watch task using callbacks
      buildDocsCSS: {
        src    : 'src',
        dest   : 'docs/build/uncompressed/',
        rename : preserveFileExtensions
      },

      buildTestCSS: {
        expand : true,
        cwd    : 'src',
        src    : [
          '**/*.less'
        ],
        dest : 'docs/build/uncompressed/',
        rename: preserveFileExtensions
      },

      buildCSS: {
        expand : true,
        cwd    : 'src',
        src    : [
          '**/*.less'
        ],
        dest : 'build/uncompressed/',
        rename: preserveFileExtensions
      }
    },

    copy: {

      srcToDocs: {

        files: [
          // exact copy for less
          {
            expand : true,
            cwd    : 'src/**/*.less',
            src    : [
              '**/*'
            ],
            dest : 'docs/build/less'
          },
          // copy everything but less files for uncompressed release
          {
            expand : true,
            cwd    : 'src/',
            src    : [
              '**/*.js',
              'images/*',
              'fonts/*'
            ],
            dest : 'docs/build/uncompressed'
          },
          // copy assets only for minified version
          {
            expand : true,
            cwd    : 'src/',
            src    : [
              'images/*',
              'fonts/*'
            ],
            dest : 'docs/build/minified'
          },

          // copy assets only for packaged version
          {
            expand : true,
            cwd    : 'src/',
            src    : [
              'images/*',
              'fonts/*'
            ],
            dest : 'docs/build/packaged'
          }
        ]
      },

      srcToBuild: {

        files: [
          // exact copy for less
          {
            expand : true,
            cwd    : 'src/',
            src    : [
              '**/*'
            ],
            dest : 'build/less'
          },
          // copy everything but less files for uncompressed release
          {
            expand : true,
            cwd    : 'src/',
            src    : [
              '**/*.js',
              'images/*',
			  'images/**/*',
              'fonts/*'
            ],
            dest : 'build/uncompressed'
          },
          // copy assets only for minified version
          {
            expand : true,
            cwd    : 'src/',
            src    : [
              'images/*',
              'fonts/*'
            ],
            dest : 'build/minified'
          },

          // copy assets only for packaged version
          {
            expand : true,
            cwd    : 'src/',
            src    : [
              'images/*',
			  'images/**/*',
              'fonts/*'
            ],
            dest : 'build/packaged'
          }
        ]
      },

      // create new rtl assets
      buildToRTL: {
        files: [
          {
            expand : true,
            cwd    : 'build/',
            src    : [
              '**'
            ],
            dest   : 'rtl'
          }
        ]
      },

      // make library available in docs
      buildToDocs: {
        files: [
          {
            expand : true,
            cwd    : 'build/',
            src    : [
              '**'
            ],
            dest   : 'docs/build/'
          }
        ]
      },

      // copy spec files to docs
      specToDocs: {
        files: [
          {
            expand : true,
            cwd    : 'spec',
            src    : [
              '**'
            ],
            dest   : 'docs/spec/'
          }
        ]
      },

      // copy spec files to docs
      examplesToDocs: {
        files: [
          {
            expand : true,
            cwd    : 'build/examples',
            src    : [
              '**'
            ],
            dest   : 'docs/build/examples/'
          }
        ]
      }

    },


    compress: {
      options: {
        archive: 'docs/build/semantic.zip'
      },
      everything: {
        files: [
          {
            expand : true,
            cwd    : 'build/',
            src    : [
              '**'
            ]
          }
        ]
      }
    },

    concat: {
      options: {
      },
      createCSSPackage: {
        src: ['build/uncompressed/**/*.css'],
        dest: 'build/packaged/css/semantic.css'
      },
      createJSPackage: {
        src: ['build/uncompressed/**/*.js'],
        dest: 'build/packaged/javascript/semantic.js'
      },
      createDocsCSSPackage: {
        src: ['docs/build/uncompressed/**/*.css'],
        dest: 'docs/build/packaged/css/semantic.css'
      },
      createDocsJSPackage: {
        src: ['docs/build/uncompressed/**/*.js'],
        dest: 'docs/build/packaged/javascript/semantic.js'
      },
    },

    cssmin: {
      options : {
        keepSpecialComments: 0,
        report: 'min'
      },

      // copy minified css to minified release
      minifyCSS: {
        expand : true,
        cwd    : 'build/uncompressed',
        src    : [
          '**/*.css'
        ],
        dest : 'build/minified/',
        rename: preserveMinFileExtensions
      },

      // add comment banner to css release
      createMinCSSPackage: {
        files: {
          'build/packaged/css/base.min.css': [
            'build/uncompressed/collections/*.css',
			'build/uncompressed/elements/*.css',
			'build/uncompressed/modules/*.css',
			'build/uncompressed/views/*.css'
          ],
          'build/packaged/css/semantic-frbird.min.css': [
		  	'build/uncompressed/site/frbird.css',
            'build/uncompressed/site/semantic-frbird.css',
			'build/uncompressed/site/flat.icon.css',
			'build/uncompressed/site/font-awesome.css',
			'build/uncompressed/site/froala_editor.css',
          ],
          'build/packaged/css/frbird.min.css': [
			'build/uncompressed/site/resp.css',
            'build/uncompressed/site/zphenix.css'
          ],
          'build/packaged/css/frmobile.min.css': [
            'build/uncompressed/site/mobile.css'
          ],
          'build/packaged/css/ie9.min.css': [
            'build/uncompressed/site/ie9.css'
          ],
          'build/packaged/css/calendar-theme.css': [
            'build/uncompressed/site/calendar.css'
          ],
          'build/packaged/css/eggs01.min.css': [
            'build/uncompressed/site/eggs.css'
          ]
        }
      }
    },

    uglify: {

      minifyJS: {
        expand : true,
        cwd    : 'build/uncompressed',
        src    : [
          '**/*.js'
        ],
        dest : 'build/minified',
        ext  : '.min.js',
        banner   : '' +
          '/*' +
          '* # <%= package.title %>\n' +
          '* Version: <%= package.version %>\n' +
          '* http://github.com/jlukic/semantic-ui\n' +
          '*\n' +
          '*\n' +
          '* Copyright <%= grunt.template.today("yyyy") %> Contributors\n' +
          '* Released under the MIT license\n' +
          '* http://opensource.org/licenses/MIT\n' +
          '*\n' +
          '* Release Date: <%= grunt.template.today("mm/dd/yyyy") %>\n' +
          '*/\n'
      },

      createMinJSPackage: {
        options: {
          mangle   : true,
          compress : true
        },
        files: {
          'build/packaged/javascript/base.min.js': [
            'build/uncompressed/modules/**/*.js'
          ],
          'build/packaged/javascript/jquery-2.min.js': [
            'build/uncompressed/javascript/jquery-2.1.0.js'
          ],
          'build/packaged/javascript/jquery_bundle.min.js': [
		  	'build/uncompressed/javascript/jquery.taconite.js',
			'build/uncompressed/javascript/jquery.livequery.min.js',
			'build/uncompressed/javascript/jquery.form.js',
			'build/uncompressed/javascript/jquery.imgareaselect.js',
			'build/uncompressed/javascript/jquery.fineuploader-3.5.0.js',
			'build/uncompressed/javascript/jquery.countdown.js',
			'build/uncompressed/javascript/jquery.address.js',
			'build/uncompressed/javascript/jquery.easing.1.3.js',
			'build/uncompressed/javascript/sly.js',
			'build/uncompressed/javascript/jquery.slides.js',
			'build/uncompressed/javascript/jquery.scrollUp.js',
			'build/uncompressed/javascript/jquery.smint.js',
			'build/uncompressed/javascript/jquery.scrollify.js',
			'build/uncompressed/javascript/jquery.qrcode.min.js',
			'build/uncompressed/javascript/lightbox.js',
			'build/uncompressed/javascript/skrollr.js',
			'build/uncompressed/javascript/picker.js',
			'build/uncompressed/javascript/picker.date.js',
			'build/uncompressed/javascript/maxlength.js',
			'build/uncompressed/javascript/jquery.arbitrary-anchor.js',
			'build/uncompressed/javascript/jquery.gritter.js',
          ],
          'build/packaged/javascript/frbird.min.js': [
            'build/uncompressed/javascript/phenix.js'
          ],
          'build/packaged/javascript/froala_editor.min.js': [
		  	'build/uncompressed/javascript/langs/beautify-html.js',
            'build/uncompressed/javascript/froala_editor.js',
			'build/uncompressed/javascript/video.js',
			'build/uncompressed/javascript/tables.js',
			'build/uncompressed/javascript/langs/zh_cn.js',
          ],
          'build/packaged/javascript/calendar.js': [
 		  	  'build/uncompressed/javascript/calendar.js',
              'build/uncompressed/javascript/calendar-en.js',   
          ],
          'build/packaged/javascript/jquery.flexslider.js': [
 		  	  'build/uncompressed/javascript/jquery.flexslider.js'
          ],
          'build/packaged/javascript/jquery.fullPage.min.js': [
 		  	  'build/uncompressed/javascript/jquery.fullPage.js',
			  'build/uncompressed/javascript/jquery.mousewheel.js',
          ],
          'build/packaged/javascript/egg.min.js': [
 		  	  'build/uncompressed/javascript/egg.js'
          ],
          'build/packaged/javascript/jquery.gsap.min.js': [
 		  	  'build/uncompressed/javascript/CSSPlugin.js',
			  'build/uncompressed/javascript/EasePack.js',
			  'build/uncompressed/javascript/jquery.gsap.js',
			  'build/uncompressed/javascript/TweenLite.js',
          ],
          'build/packaged/javascript/jquery.zclip.min.js': [
 		  	  'build/uncompressed/javascript/jquery.zclip.min.js'
          ],
        }
      }
    },

    coveralls: {
        options: {
            coverage_dir: 'coverage'
        }
    }

  };


  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-docco-multi');
  grunt.loadNpmTasks('grunt-cssjanus');
  grunt.loadNpmTasks('grunt-clear');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-karma-coveralls');

  grunt.initConfig(config);

  grunt.registerTask('default', defaultTasks);
  grunt.registerTask('test', testTasks);

  grunt.registerTask('release', releaseTasks);
  grunt.registerTask('rtl', rtlTasks);
  grunt.registerTask('docs', docTasks);
  grunt.registerTask('build', buildTasks);
  grunt.registerTask('reset', resetTasks);

  // compiles only changed less files <https://npmjs.org/package/grunt-contrib-watch>
  grunt.event.on('watch', setWatchFiles);

};
