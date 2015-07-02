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

 /* global: angular, Firebase, gapi, qrcode, Snap, WURFL, CARDBOARD, CONFIG */

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
}

function distortionPlot(k1, k2) {
  var canvas = document.getElementById("distortion_plot");
  var ctx=canvas.getContext("2d");
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

function funGraph(ctx,axes,func,color,thick) {
  var xx, yy, dx=2, x0=axes.x0, y0=axes.y0;
  var xscale=axes.xscale, yscale=axes.yscale;
  var iMax = Math.round((ctx.canvas.height-x0)/dx);
  var iMin = axes.doNegativeX ? Math.round(-x0/dx) : 0;
  ctx.beginPath();
  ctx.lineWidth = thick;
  ctx.strokeStyle = color;

  for (var i=iMin;i<=iMax;i++) {
    xx = dx*i; yy = axes.yscale*func(xx/axes.xscale);
    if (i==iMin) ctx.moveTo(y0-yy,x0+xx);
    else         ctx.lineTo(y0-yy,x0+xx);
  }
  ctx.stroke();
}

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

function makeQr(minType, correctionLevel, text, customPadding) {
  var type = minType;
  // TODO: something more efficient than trial & error
  while (true) {
    try {
      var qr = qrcode(type, correctionLevel, customPadding);
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
  var svg = Snap(width, height);
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

function initGapi() {
  window.initGapi();
}

angular
.module('myApp', ['firebase', 'ui.bootstrap', 'ngAnimate'])

.controller('ModalCtrl', function ($scope, $modal) {
  $scope.open = function () {

    var modalInstance = $modal.open({
      templateUrl: 'compatibleSmartphones.html',
      controller: 'ModalInstanceCtrl',
      size: 'lg',
    });
  };
})

.controller('ModalInstanceCtrl', function ($scope, $modalInstance) {
  $scope.ok = function () {
    $modalInstance.close();
  };
})

.controller('myController', ['$scope', '$firebase', '$timeout', '$q', '$window',
  function($scope, $firebase, $timeout, $q, $window) {
    var firebase_root = new Firebase(CONFIG.FIREBASE_URL);

    var gapiDefer = $q.defer();
    var gapiReady = gapiDefer.promise;

      // TODO: use angular service
      $window.initGapi = function() {
        gapi.client.setApiKey(CONFIG.GOOGLE_API_KEY);
        gapi.client.load('urlshortener', 'v1').then(function() {
          gapiDefer.resolve();
        });
      }

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
      }

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
      }

      var DeviceParams = CARDBOARD.DeviceParams;

      $scope.steps = { WELCOME: 0, INPUT: 1, OUTPUT: 2};
      $scope.wizard_step = $scope.steps.WELCOME;

      $scope.vertical_alignment_type = DeviceParams.VerticalAlignmentType;
      $scope.button_type = DeviceParams.ButtonType;

      $scope.alerts = [];
      $scope.focus = null;

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
        // Restore defaults for fields hidden behind "advanced" mode
        if (!$scope.data.is_advanced) {
          angular.extend($scope.params, {
            "left_eye_field_of_view_angles": [50, 50, 50, 50],
          });
          $scope.params.has_magnet = false;
        }
        // Magnet button implies has_magnet
        if ($scope.params.primary_button === DeviceParams.ButtonType.MAGNET) {
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

      // When panel with parm QR is opened, generate the QR.  We do this
      // lazily since it employs the URL shortener service.
      $scope.$watch('wizard_step', function(value) {
        if (value == $scope.steps.OUTPUT) {
          updateParamQr();
        }
      });

      $scope.reset = function() {
        $scope.params = {
          "vendor": "Your company",
          "model": "Your model",
          "screen_to_lens_distance": 0.042,
          "inter_lens_distance": 0.060,
          "vertical_alignment": DeviceParams.VerticalAlignmentType.BOTTOM,
          "tray_to_lens_distance": 0.035,
          "left_eye_field_of_view_angles": [50, 50, 50, 50],
          "distortion_coefficients": [0, 0],
          "has_magnet": false,
          "primary_button": DeviceParams.ButtonType.NONE,
        };
        $scope.save();
      };

      // Called when user changes params URI input field.
      $scope.set_params_uri = function() {
        var params = CARDBOARD.uriToParams($scope.data.params_uri);
        if (params) {
          $scope.params = params;
          // infer "advanced mode" based on values
          $scope.data.is_advanced =
          (params.primary_button != DeviceParams.ButtonType.MAGNET &&
            params.has_magnet == true) ||
          (params.left_eye_field_of_view_angles.toString() !=
            [50, 50, 50, 50].toString());
          $scope.save();
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
                  $scope.wizard_step == $scope.steps.WELCOME) {
                  $scope.wizard_step = $scope.steps.INPUT;
              }
              $scope.allow_auto_advance = false;
            } else {
              $scope.allow_auto_advance = true;
            };
          });
          } else {
            console.log("Logged out of Firebase.");
            $scope.firebase_uid = null;
          }
        });
});
}])

.config(function($provide) {
  $provide.decorator("$exceptionHandler", ['$delegate', function($delegate) {
    return function(exception, cause) {
      $delegate(exception, cause);
      alert("An error has occurred.\n\n" + exception.message);
    };
  }]);
})

.config(['$compileProvider', function($compileProvider) {
  // allow data:image, for our image download links
  $compileProvider.aHrefSanitizationWhitelist(
    /^\s*((https?|ftp|mailto|tel|file):|data:image\/)/);
}])

// Scale model-to-view by given factor and vice versa.
.directive('myScale',
  function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel) {
        var scale = parseInt(attrs.myScale);
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
            if (isNaN(parsed)) return null;
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
        var fraction_digits = parseInt(attrs.roundView);
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
