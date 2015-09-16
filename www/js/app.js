/*!
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/*global alert, btoa, confirm, window, document, XMLSerializer,
  angular, Firebase, gapi, qrcode, Snap, WURFL, CARDBOARD, CONFIG, ga*/

var QR_PIXELS_PER_CELL = 3;

// For QR type 5, 32 characters of usable data.
var PARAM_QR_CUSTOM_PADDING = {
  data_offset_bytes: 35,
  mask_override: 1,
  random_seed: 'seed5',
  pad_bytes: [
  0x06, 0xcc, 0xcc, 0xcc, 0xcc, 0xce, 0x45, 0x6e,
  0x57, 0x00, 0x19, 0x99, 0x99, 0x99, 0x98, 0x09,
  0xee, 0x2c, 0xe0, 0x66, 0xc6, 0x66, 0x4e, 0x60,
  0x14, 0xd2, 0x6e, 0x08, 0x1a, 0x9d, 0x19, 0x58,
  0xb8, 0x0a, 0x40, 0xdd, 0x60, 0x74, 0x6a, 0x62,
  0xe5, 0x60, 0x4d, 0x2d, 0x58, 0x88, 0x19, 0xc9,
  0xab, 0x8d, 0x98, 0x16, 0x58, 0x1b, 0x20, 0x66,
  0x60, 0x60, 0x66, 0x60, 0x4d, 0x46, 0xad, 0x51,
  0xcc, 0xcd, 0x99, 0xcc, 0xcd, 0x85,
  ],
};

var HELPER_PARAMETER_MODAL = {
  'vendor': {
    focus: 'vendor',
    title: 'Enter your company\'s name',
    content: '<p><strong>Note:</strong> This name will be shown in all apps which work with Google Cardboard after completing the viewer pairing&nbsp;flow.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'model': {
    focus: 'vendor',
    title: 'Enter viewer name. It will be visible to users.',
    content: '<p><strong>Note:</strong> This name will be shown in all apps which work with Google Cardboard after completing the viewer pairing&nbsp;flow.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'primary_button': {
    focus: 'vendor',
    title: 'Primary Button&nbsp;Type',
    content: '<p><em>None</em> if your device has no inputs and the smartphone screen is not accessible or if your device has a separate Bluetooth controller and no other built&#45;in&nbsp;inputs.</p><p><em>Touch</em> if your device has no inputs, but the user can touch the screen with his/her finger without taking the phone out of the&nbsp;viewer.</p><p><em>Indirect Touch</em> if your device has a mechanical input which is ultimately registered as a screen touch, but the user&rsquo;s finger is not touching the screen&nbsp;directly.</p><p><em>Magnet</em> if your device has a Google Cardboard&#45;like magnetic&nbsp;input.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'screen_to_lens_distance': {
    focus: 'vendor',
    title: 'Screen to lens distance&nbsp;(mm)',
    content: '<img src="images/screen-to-lens.png" height="638" width="786" class="img-responsive" alt=" " /><p><strong>Note:</strong> If your viewer comes with an adjustable focal distance, measure the average distance between the screen and the&nbsp;lenses.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'inter_lens_distance': {
    focus: 'vendor',
    title: 'Inter&#45;lens distance&nbsp;(mm)',
    content: '<img src="images/interlens-distance.png" height="638" width="786" class="img-responsive" alt=" " /><p><strong>Note:</strong> If your viewer comes with an adjustable inter-lens distance, measure the average distance between the screen and the&nbsp;lenses. </p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'vertical_alignment': {
    focus: 'vendor',
    title: 'Screen vertical&nbsp;alignment',
    content: '<p><strong>Note:</strong> Indicate if the smartphone screen is aligned to the top, bottom or center of your viewer when the smartphone is inserted. For most viewers, this should be set to BOTTOM.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'tray_to_lens_distance': {
    focus: 'vendor',
    title: 'Tray to lens&#45;center distance&nbsp;(mm)',
    content: '<p><strong>Bottom:</strong></p><img ng-if="params.vertical_alignment == vertical_alignment_type.BOTTOM" class="img-responsive" width="596" height="423" src="images/tray_to_lens_distance_bottom.png" alt=" " /><p><strong>Top:</strong></p><img ng-if="params.vertical_alignment == vertical_alignment_type.TOP" class="img-responsive" width="597" height="425" src="images/tray_to_lens_distance_top.png" alt=" " /></p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'distortion_coefficients': {
    focus: 'vendor',
    title: 'Distortion Coefficients',
    content: '<p>View the lens calibration VR scene which appears on your smartphone. Adjust the data until the vertical lines appear straight and angles appear right (90 degrees) through your viewer&nbsp;lenses.</p><div class="hide-in-modal"><p>This is the current lens curvature for your distortion&nbsp;coefficients:</p><p class="text-center"><div id="canvas-container"><canvas id="distortion_plot" width="140" height="280" style="width:auto; height: 100%;"></canvas></div></p></div><p><strong>Note:</strong> distortion coefficients should not be left set to 0.00 for any curved lens.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'left_eye_field_of_view_angles': {
    focus: 'vendor',
    title: 'Field-of-view angle',
    content: '<p>Enter the field-of-view angles for your left lens. For most viewers these fields should be set to 50 degrees or&nbsp;more.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
  'has_magnet': {
    focus: 'vendor',
    title: 'Embeded Magnets',
    content: '<p>Select this checkbox if your viewer has at least one embedded magnet. Doing so will inform all apps built using the Cardboard SDKs that the smartphone&rsquo;s magnetometer should not be&nbsp;used.</p><p class="help"><a href="https://github.com/google/wwgc/blob/master/docs/HELP.md" target="_blank">Help &nbsp;<img src="images/help-invert.png" height="19" width="19" alt="?" /><paper-ripple></paper-ripple></a></p>',
  },
};

function showAxes(ctx,axes) {
  var x0=axes.x0, h=ctx.canvas.height;
  var y0=axes.y0, w=ctx.canvas.width;
  var xmin = axes.doNegativeX ? 0 : x0;
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgb(128,128,128)";
  ctx.moveTo(y0,xmin); ctx.lineTo(y0,h);  // X axis
  ctx.moveTo(0,x0);    ctx.lineTo(w,x0);  // Y axis
  ctx.stroke();
}

function funGraph(ctx,axes,func,color,thick) {
  var i, xx, yy, dx=2, x0=axes.x0, y0=axes.y0;
  var xscale=axes.xscale, yscale=axes.yscale;
  var iMax = Math.round((ctx.canvas.height-x0)/dx);
  var iMin = axes.doNegativeX ? Math.round(-x0/dx) : 0;
  ctx.beginPath();
  ctx.lineWidth = thick;
  ctx.strokeStyle = color;

  for (i=iMin;i<=iMax;i++) {
    xx = dx*i; yy = yscale*func(xx/xscale);
    if (i===iMin) {
      ctx.moveTo(y0-yy,x0+xx);
    } else {
      ctx.lineTo(y0-yy,x0+xx);
    }
  }
  ctx.stroke();
}

function distortionPlot(k1, k2) {
  var canvas = document.getElementById("distortion_plot");
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var axes = {
    x0: 0.5 + 0.5*canvas.height,  // x0 pixels from left to x=0
    y0: 0.5 + 0.8*canvas.width,   // y0 pixels from top to y=0
    // TODO: correct x range
    xscale: canvas.height / 2,    // num. pixels from x=0 to x=1
    yscale: canvas.width / 2,
    doNegativeX: true,
  };

  showAxes(ctx,axes);
  funGraph(ctx,axes, function(x) {
    return 1 + k1 * Math.pow(x, 2) + k2 * Math.pow(x, 4);
  }, "rgb(255,110,64)", 2);
}

function makeQr(minType, correctionLevel, text, customPadding) {
  var qr, type = minType;
  // TODO: something more efficient than trial & error
  while (true) {
    try {
      qr = qrcode(type, correctionLevel, customPadding);
      qr.addData(text);
      qr.make();
      return qr;
    } catch (e) {
      if (!e.message.match(/code length overflow/)) {
        throw e;
      }
      ++type;
    }
  }
}

// rotate image proper in place, without CSS
function rotateImg(img, radians) {
  var canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  var canvas_context = canvas.getContext('2d');
  canvas_context.translate(img.width/2, img.height/2);
  canvas_context.rotate(radians);
  canvas_context.drawImage(img, -img.width/2, -img.height/2);
  img.src = canvas.toDataURL();
}

// generate SVG from an image, mapping pixels to rects
function svgFromImage(img, imgScale) {
  var canvas = document.createElement('canvas');
  var width = canvas.width = img.width;
  var height = canvas.height = img.height;
  var canvas_context = canvas.getContext('2d');
  canvas_context.drawImage(img, 0, 0);
  // 8-bit RGBA pixel array from top-left to bottom-right
  var pixels = canvas_context.getImageData(0, 0, width, height).data;
  var x, y;
  var svg = new Snap(width, height);
  // Snap library annoyingly assumes we want the element appended to document
  svg.node.parentNode.removeChild(svg.node);
  svg.rect(0, 0, width, height).attr({fill: 'white'});
  var black_pixels = svg.g().attr({fill: 'black'});
  for (y = 0; y < height; y += imgScale) {
    for (x = 0; x < width; x += imgScale) {
      if (pixels[(x + y * width) * 4] < 128) {
        black_pixels.add(svg.rect(x, y, imgScale, imgScale));
      }
    }
  }
  return svg.node;
}

function areArraysEqual(arr1, arr2) {
  var i;
  if (arr1 === arr2) {
    return true;
  }
  if (arr1 === null || arr2 === null || arr1.length !== arr2.length) {
    return false;
  }
  for (i = 0; i < arr1.length; ++i) {
    if(arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

function initGapi() {
  if (window.initGapi2) {
    window.initGapi2();
  } else {
    // wait for angular controller init
    window.setTimeout(initGapi, 500);
  }
}

if (CONFIG.GOOGLE_ANALYTICS_ID) {
  ga('create', CONFIG.GOOGLE_ANALYTICS_ID, 'auto');
}
// note this error handler will be overridden during angular module init
window.onerror = function(message, file, line, col, error) {
  ga('send', 'exception', {
    'exDescription': error ? error.stack : message,
    'exFatal': true});
};

angular
.module('myApp', ['firebase', 'ui.bootstrap', 'ngAnimate', 'ngMaterial', 'ngScrollSpy'])

.config(function($mdThemingProvider) {
  $mdThemingProvider.definePalette('cardboard-orange', {
    '50': 'ff6e40',
    '100': 'ff6e40',
    '200': 'ff6e40',
    '300': 'ff6e40',
    '400': 'ff6e40',
    '500': 'ff6e40',
    '600': 'ff6e40',
    '700': 'ff6e40',
    '800': 'ff6e40',
    '900': 'ff6e40',
    'A100': 'ff6e40',
    'A200': 'ff6e40',
    'A400': 'ff6e40',
    'A700': 'ff6e40',
    'contrastDefaultColor': 'light',
    'contrastDarkColors': ['50', '100', '200', '300', '400', 'A100'],
    'contrastLightColors': undefined
  });

  $mdThemingProvider.definePalette('cardboard-blue', {
    '50': '4787f1',
    '100': '4787f1',
    '200': '4787f1',
    '300': '4787f1',
    '400': '4787f1',
    '500': '4787f1',
    '600': '4787f1',
    '700': '4787f1',
    '800': '4787f1',
    '900': '4787f1',
    'A100': '4787f1',
    'A200': '4787f1',
    'A400': '4787f1',
    'A700': '4787f1',
    'contrastDefaultColor': 'light',
    'contrastDarkColors': ['50', '100', '200', '300', '400', 'A100'],
    'contrastLightColors': undefined
  });

  $mdThemingProvider.theme('default')
  .primaryPalette('cardboard-orange', {
        'default': '800', // by default use shade 400 from the pink palette for primary intentions
        'hue-1': '100', // use shade 100 for the <code>md-hue-1</code> class
        'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
        'hue-3': 'A100' // use shade A100 for the <code>md-hue-3</code> class
      })
  .accentPalette('cardboard-blue');})

.animation('.slide-margin', function($animateCss) {
  var animation = {
    enter : function(element, done) {
      var animator = $animateCss(element, {
        from: {
          maxHeight: '0vh'
        },
        to: {
          maxHeight: '100vh'
        },
        duration: 0.75
      });
      animator.start().finally(done);
    },
    leave : function(element, done) {
      var animator = $animateCss(element, {
        from: {
          maxHeight: '100vh'
        },
        to: {
          maxHeight: '0vh'
        },
        duration: 0.3
      });
      animator.start().finally(done);
    },
    move : function(element, done) {
    },
    addClass : function(element, className, done) {
    },
    removeClass : function(element, className, done) {
    }
  };
  return animation;})

.controller('ModalInstanceCtrl', function ($scope, $modalInstance) {
  $scope.ok = function () {
    $modalInstance.close();
  };
})

.controller('ModalCtrl', function ($scope, $modal) {
  $scope.open = function () {
    $modal.open({
      templateUrl: 'compatibleSmartphones.html',
      controller: 'ModalInstanceCtrl',
      size: 'lg',
    });
  };
})

.controller('myController', ['$scope', '$firebase', '$timeout', '$q', '$window', '$mdDialog',
  function($scope, $firebase, $timeout, $q, $window, $mdDialog) {
    var firebase_root = new Firebase(CONFIG.FIREBASE_URL);

    var gapiDefer = $q.defer();
    var gapiReady = gapiDefer.promise;

      // TODO: use angular service
      $window.initGapi2 = function() {
        gapi.client.setApiKey(CONFIG.GOOGLE_API_KEY);
        // TODO: propagate API load error
        gapi.client.load('urlshortener', 'v1').then(function() {
          gapiDefer.resolve();
        });
      };

      // Returns promise for shortUrl string.
      var getShortUrl = function(longUrl) {
        return new $q(function(resolve, reject) {
          gapiReady.then(function() {
            gapi.client.urlshortener.url.insert({
              'longUrl': longUrl,
            }).then(function(response) {
              resolve(response.result.id);
            }, function(reason) {
              console.log('Short URL error: ' + reason.result.error.message);
              reject(reason.result.error);
            });
          });
        });
      };

      var updateParamQr = function() {
        var qr_div = document.getElementById('params_qrcode');
        qr_div.innerHTML = "Generating QR code...";
        getShortUrl($scope.data.params_uri).then(function(shortUrl) {
          var url_sans_scheme = shortUrl.replace('http://', '');
          var qr = makeQr(5, 'L', url_sans_scheme, PARAM_QR_CUSTOM_PADDING);
          qr_div.innerHTML = qr.createImgTag(QR_PIXELS_PER_CELL);
          // TODO: figure out why img not complete w/o extra cycles on Firefox
          $timeout(function() {
            rotateImg(qr_div.firstChild, -Math.PI/2);
            $timeout(function() {
              var svg = svgFromImage(qr_div.firstChild, QR_PIXELS_PER_CELL);
              $scope.svg_params_qr_uri = 'data:image/svg+xml;base64,' +
              btoa((new XMLSerializer()).serializeToString(svg));
              $scope.png_params_qr_uri = qr_div.firstChild.src;
            });
          });
        });
      };

      $scope.alert = '';

      $scope.showDetailsModal = function(ev) {
        $mdDialog.show({
          targetEvent: ev,
          clickOutsideToClose: true,
          parent: angular.element(document.body),
          ok: 'Got it!',
          ariaLabel: HELPER_PARAMETER_MODAL[$scope.focus].title,
          title: HELPER_PARAMETER_MODAL[$scope.focus].title,
          template: '<md-dialog>' +
                    '<md-toolbar>' +
                    '<div class="md-toolbar-tools">' +
                    '<h2>' + HELPER_PARAMETER_MODAL[$scope.focus].title + '</h2>' +
                    '<span flex></span>' +
                    '</div>' +
                    '</md-toolbar>' +
                    '<md-dialog-content>' +
                    HELPER_PARAMETER_MODAL[$scope.focus].content +
                    '</md-dialog-content>' +
                    '</md-dialog>',
        }).then(function(answer) {
        }, function() {
        });
      };

      var DeviceParams = CARDBOARD.DeviceParams;

      $scope.steps = { WELCOME: 0, OUTPUT: 1};
      $scope.wizard_step = $scope.steps.WELCOME;

      $scope.helper_sections = HELPER_PARAMETER_MODAL;

      $scope.vertical_alignment_type = DeviceParams.VerticalAlignmentType;
      $scope.vertical_alignment_type_options = [{
          id: DeviceParams.VerticalAlignmentType.BOTTOM,
          text: 'Bottom',
          id_attribute: 'vertical_alignment_none',
      }, {
          id: DeviceParams.VerticalAlignmentType.CENTER,
          text: 'Center',
          id_attribute: 'vertical_alignment_magnet',
      }, {
          id: DeviceParams.VerticalAlignmentType.TOP,
          text: 'Top',
          id_attribute: 'vertical_alignment_touch',
      }];


      $scope.button_type = DeviceParams.ButtonType;
      $scope.button_type_options = [{
          id: DeviceParams.ButtonType.NONE,
          id_attribute: 'primary_button_none',
          text: 'None',
      }, {
          id: DeviceParams.ButtonType.MAGNET,
          id_attribute: 'primary_button_magnet',
          text: 'Magnet',
      }, {
          id: DeviceParams.ButtonType.TOUCH,
          id_attribute: 'primary_button_touch',
          text: 'Touch',
      }, {
          id: DeviceParams.ButtonType.INDIRECT_TOUCH,
          id_attribute: 'primary_button_indirect_touch',
          text: 'Indirect Touch',
      }];


      $scope.alerts = [];
      $scope.focus = null;

      $scope.isAdvancedExpanded = false;

      $scope.is_mobile = WURFL.is_mobile;

      $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
      };

      $scope.save = function() {
        // Ensure tray_to_lens_distance has nominal value for best-effort
        // support of apps using older revsion of params proto.
        // TODO: reference a defaults singleton

        if ($scope.params.vertical_alignment ===
          DeviceParams.VerticalAlignmentType.CENTER) {
          $scope.params.tray_to_lens_distance = 0.035;
      }
        // Magnet button implies has_magnet
        if ($scope.params.primary_button === DeviceParams.ButtonType.MAGNET ) {
          $scope.params.has_magnet = true;
          $scope.has_magnet_field_enabled = false;
        } else {
          $scope.has_magnet_field_enabled = true;
        }

        $scope.data.update_timestamp = Firebase.ServerValue.TIMESTAMP;
        $scope.data.params_uri = CARDBOARD.paramsToUri($scope.params);
        $scope.data.$save();

        distortionPlot(
          $scope.params.distortion_coefficients[0],
          $scope.params.distortion_coefficients[1]);
      };

      // true if current settings have non-default "advanced" field values
      var hasAdvancedSettings = function() {
        return ($scope.params !== undefined)
            && (!areArraysEqual($scope.params.left_eye_field_of_view_angles, [50, 50, 50, 50])
                || ($scope.params.has_magnet === true
                    && $scope.params.primary_button !== DeviceParams.ButtonType.MAGNET));
      };

      $scope.$watch('wizard_step', function(value) {
        var virtual_page;
        switch (value) {
          case $scope.steps.OUTPUT:
            // Let user know when modifications to advanced fields are hidden.
            if (hasAdvancedSettings() && !$scope.isAdvancedExpanded
                && !confirm("It looks like you changed some of the advanced fields, but they're currently hidden. \n\nDo you want to generate your profile?")) {
              $scope.wizard_step = $scope.steps.WELCOME;
              return;
            }
            // Generate the QR.  We do this lazily since it employs the URL
            // shortener service.
            updateParamQr();
            virtual_page = window.location.pathname + 'qr_output';
            break;
          case $scope.steps.WELCOME:
            virtual_page = window.location.pathname + 'form';
            break;
        }
        $scope.isAdvancedExpanded = hasAdvancedSettings();
        ga('set', 'page', virtual_page);
        ga('send', 'pageview');
      });

      $scope.reset = function() {
        $scope.params = {
          "vendor": "",
          "model": "",
          "screen_to_lens_distance": 0.042,
          "inter_lens_distance": 0.060,
          "vertical_alignment": DeviceParams.VerticalAlignmentType.BOTTOM,
          "tray_to_lens_distance": 0.035,
          "left_eye_field_of_view_angles": [50, 50, 50, 50],
          "distortion_coefficients": [0, 0],
          "has_magnet": false,
          "primary_button": DeviceParams.ButtonType.NONE,
        };

        $scope.isAdvancedExpanded = false;
        $scope.save();
      };

      $scope.saveOrLoadParameters = {
        open: false
      };

      // Called when user changes params URI input field.
      $scope.set_params_uri = function() {
        if ($scope.data.params_uri === '') {
          $scope.save();
        } else {
          var params = CARDBOARD.uriToParams($scope.data.params_uri);
          if (params) {
            $scope.params = params;
            $scope.save();
            $scope.isAdvancedExpanded = hasAdvancedSettings();
          }
        }
      };

      $timeout(function () {
        if (!firebase_root.getAuth()) {
          firebase_root.authAnonymously(function(error, authData) {
            if (error) {
              console.log("Firebase login failed.", error);
              $scope.alerts.push({ type: 'danger',
                msg: 'Firebase login failed.'});
            }
          });
        }
      });

      firebase_root.onAuth(function(authData) {
        // Note that onAuth will call given function immediately if user is
        // already authenticated.  Use $timeout to ensure we consistently
        // run within digest loop.
        // TODO: use angularfire $onAuth
        $timeout(function() {
          if (authData) {
            console.log("Logged in to Firebase via provider",
              authData.provider);
            $scope.firebase_token = authData.token;
            var firebase_user = firebase_root.child('users').child(authData.uid);
            $scope.data = $firebase(firebase_user).$asObject();
            // init form data on initial load
            // TODO: listen for out-of-band changes to params_uri
            $scope.data.$loaded().then(function(data) {
              $scope.data.show_lens_center = true;
              if (!$scope.data.params_uri) {
                $scope.reset();
              } else {
                $scope.set_params_uri();
              }
            });
            // generate remote QR code
            // Remote link href won't be available until next $digest cycle.
            $timeout(function () {
              var longUrl = document.getElementById('remote_link').href;
              getShortUrl(longUrl).then(function(shortUrl) {
                $timeout(function() {
                  var qr = makeQr(2, 'L', shortUrl);
                  document.getElementById('remote_qrcode').innerHTML =
                  qr.createImgTag(QR_PIXELS_PER_CELL);
                  $scope.short_remote_link = shortUrl;
                });
              });
            });
            // Manage auto-advance from welcome step once remote scene paired.
            // Advance only allowed when starting from no active connections.
            firebase_user.child('connections').on('value', function(connections) {
              if (connections.val()) {
                if ($scope.allow_auto_advance &&
                  $scope.wizard_step === $scope.steps.WELCOME) {
                  $scope.wizard_step = $scope.steps.WELCOME;
              }
              $scope.allow_auto_advance = false;
            } else {
              $scope.allow_auto_advance = true;
            }
          });
          } else {
            console.log("Logged out of Firebase.");
          }
        });
});
}])

.config(function($provide) {
  $provide.decorator("$exceptionHandler", ['$delegate', function($delegate) {
    return function(exception, cause) {
      $delegate(exception, cause);
      ga('send', 'exception', {
        'exDescription': exception.stack || exception.message,
        'exFatal': true});
      alert("An error has occurred.\n\n" + exception.message);
    };
  }]);
})

.config(['$compileProvider', function($compileProvider) {
  // allow data:image, for our image download links
  $compileProvider.aHrefSanitizationWhitelist(
    /^\s*((https?|ftp|mailto|tel|file):|data:image\/)/);
}])

.filter('raw_html', ['$sce', function($sce){
  return function(val) {
    return $sce.trustAsHtml(val);
  };
}])

// Validation for zero distortion coefficients
.directive('ngNonZero', 
  function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function($scope, $elem, $attrs, ngModel) {
        $scope.$watch($attrs.ngModel, function(value) {
          var isValid = (value !== 0);
          ngModel.$setValidity($attrs.ngModel, isValid);
        });
      }
    };
  })

// Scale model-to-view by given factor and vice versa.
.directive('myScale',
  function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel) {
        var scale = parseInt(attrs.myScale, 10);
        // model-to-view
        ngModel.$formatters.push(
          function(val) {
            if (val) {
              return val * scale;
            }
          });
        // view-to-model
        ngModel.$parsers.push(
          function (val) {
            var parsed = parseFloat(val);
            if (isNaN(parsed)) {
              return null;
            }
            return parsed / scale;
          });
      }
    };
  })

// Round view of numeric value to given fractional digits.
.directive('roundView',
  function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel) {
        var fraction_digits = parseInt(attrs.roundView, 10);
        // model-to-view
        // Can't use a formatter here since we want full fixed point display
        // (e.g. 0 rendered as "0.00").
        ngModel.$render = function() {
          if (ngModel.$isEmpty(ngModel.$viewValue)) {
            elem.val('');
          } else {
            elem.val(Number(ngModel.$viewValue).toFixed(fraction_digits));
          }
        };
        ngModel.$viewChangeListeners.push(function() {
          ngModel.$render();
        });
      }
    };
  })
;
