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

"use strict";

/* globals: CARDBOARD, WURFL, THREE */

CARDBOARD.CardboardView = function(screen_params, device_params) {
  this.screen = screen_params;
  this.device = device_params;
};

CARDBOARD.CardboardView.prototype = {

  getLeftEyeFov: function() {
    var screen = this.screen;
    var cdp = this.device;
    var distortion = this.distortion;

    // The screen-to-lens distance can be used as a rough approximation
    // of the virtual-eye-to-screen distance. 
    var eyeToScreenDist = cdp.screen_to_lens_distance;
  
    var outerDist = (screen.width_meters - cdp.inter_lens_distance) / 2;
    var innerDist =  cdp.inter_lens_distance / 2;
    var bottomDist = CARDBOARD.getYEyeOffsetMeters(screen, cdp);
    var topDist = screen.height_meters - bottomDist;
  
    var outerAngle = THREE.Math.radToDeg(Math.atan(
        distortion.distort(outerDist / eyeToScreenDist)));
    var innerAngle = THREE.Math.radToDeg(Math.atan(
        distortion.distort(innerDist / eyeToScreenDist)));
    var bottomAngle = THREE.Math.radToDeg(Math.atan(
        distortion.distort(bottomDist / eyeToScreenDist)));
    var topAngle = THREE.Math.radToDeg(Math.atan(
        distortion.distort(topDist / eyeToScreenDist)));
  
    var maxFov = cdp.left_eye_field_of_view_angles;  // L, R, T, B

    return {
      left:     Math.min(outerAngle, maxFov[0]),
      right:    Math.min(innerAngle, maxFov[1]),
      bottom:   Math.min(bottomAngle, maxFov[3]),
      top:      Math.min(topAngle, maxFov[2]),
    }
  },

  getLeftEyeFovAndViewportNoDistortionCorrection: function() {
    var screen = this.screen;
    var cdp = this.device;
    var distortion = this.distortion;

    // The screen-to-lens distance can be used as a rough approximation
    // of the virtual-eye-to-screen distance. 
    var eyeToScreenDist = cdp.screen_to_lens_distance;
    var halfLensDistance = cdp.inter_lens_distance / 2 / eyeToScreenDist;
    var screenWidth = screen.width_meters / eyeToScreenDist;
    var screenHeight = screen.height_meters / eyeToScreenDist;
    var xPxPerTanAngle = screen.width / screenWidth;
    var yPxPerTanAngle = screen.height / screenHeight;
  
    var eyePosX = screenWidth / 2 - halfLensDistance;
    var eyePosY = CARDBOARD.getYEyeOffsetMeters(screen, cdp) / eyeToScreenDist;
  
    var maxFov = cdp.left_eye_field_of_view_angles;  // L, R, T, B
    var outerDist = Math.min(eyePosX, distortion.distortInverse(
        Math.tan(THREE.Math.degToRad(maxFov[0]))));
    var innerDist = Math.min(halfLensDistance, distortion.distortInverse(
        Math.tan(THREE.Math.degToRad(maxFov[1]))));
    var bottomDist = Math.min(eyePosY, distortion.distortInverse(
        Math.tan(THREE.Math.degToRad(maxFov[3]))));
    var topDist = Math.min(screenHeight - eyePosY, distortion.distortInverse(
        Math.tan(THREE.Math.degToRad(maxFov[2]))));
  
    var result = { fov: {}, viewport: {} };
  
    result.fov.left = THREE.Math.radToDeg(Math.atan(outerDist));
    result.fov.right = THREE.Math.radToDeg(Math.atan(innerDist));
    result.fov.bottom = THREE.Math.radToDeg(Math.atan(bottomDist));
    result.fov.top = THREE.Math.radToDeg(Math.atan(topDist));
  
    result.viewport.x = Math.round((eyePosX - outerDist) * xPxPerTanAngle);
    result.viewport.width = Math.round((eyePosX + innerDist) * xPxPerTanAngle)
        - result.viewport.x;
    result.viewport.y = Math.round((eyePosY - bottomDist) * yPxPerTanAngle);
    result.viewport.height = Math.round((eyePosY + topDist) * yPxPerTanAngle)
        - result.viewport.y;
  
    return result;
  },
};

Object.defineProperties(CARDBOARD.CardboardView.prototype, {
  device: {
    get: function() {
      return this._device;
    },
    set: function(value) {
      this._device = value;
      this.distortion = new CARDBOARD.DistortionParams(
          value.distortion_coefficients);
    },
  },
});

var METERS_PER_INCH = 0.0254;

CARDBOARD.ScreenParams = function(width, height, dpi, border_size_meters) {
  this.width = width;
  this.height = height;
  this.dpi = dpi;
  this.border_size_meters = border_size_meters;
};

Object.defineProperties(CARDBOARD.ScreenParams.prototype, {
  width_meters: {
    get: function () {
      return this.width / this.dpi * METERS_PER_INCH;
    },
  },
  height_meters: {
    get: function () {
      return this.height / this.dpi * METERS_PER_INCH;
    },
  }
});

// Returns Y offset from bottom of given physical screen to lens center.
CARDBOARD.getYEyeOffsetMeters = function(screen_params, device_params) {
    var VerticalAlignmentType =
        CARDBOARD.DeviceParams.VerticalAlignmentType;
    switch (device_params.vertical_alignment) {
      default:
      case VerticalAlignmentType.CENTER:
        return screen_params.height_meters / 2;
      case VerticalAlignmentType.BOTTOM:
        return device_params.tray_to_lens_distance -
            screen_params.border_size_meters;
      case VerticalAlignmentType.TOP:
        return screen_params.height_meters -
            (device_params.tray_to_lens_distance -
                screen_params.border_size_meters);
    }
};

CARDBOARD.DistortionParams = function(coefficients) {
  this.coefficients = coefficients;
};

CARDBOARD.DistortionParams.prototype = {

  _distortionFactor: function(radius) {
    var result = 1.0;
    var rFactor = 1.0;
    var rSquared = radius * radius;
    this.coefficients.forEach(function (ki) {
      rFactor *= rSquared;
      result += ki * rFactor;
    });
    return result;
  },

  distort: function(radius) {
    return radius * this._distortionFactor(radius);
  },

  distortInverse: function(radius) {
    var r0 = radius / 0.9;
    var r1 = radius * 0.9;
    var r2;
    var dr0 = radius - this.distort(r0);
    var dr1;
    while (Math.abs(r1 - r0) > 0.0001) {
      dr1 = radius - this.distort(r1);
      r2 = r1 - dr1 * ((r1 - r0) / (dr1 - dr0));
      r0 = r1;
      r1 = r2;
      dr0 = dr1;
    }
    return r1;
  },
};

CARDBOARD.getProjectionMatrixPair = function(left_fov_angles, near, far) {
  var outer = Math.tan( THREE.Math.degToRad( left_fov_angles.left )) * near;
  var inner = Math.tan( THREE.Math.degToRad( left_fov_angles.right )) * near;
  var bottom = Math.tan( THREE.Math.degToRad( left_fov_angles.bottom )) * near;
  var top = Math.tan( THREE.Math.degToRad( left_fov_angles.top )) * near;

  return {
    left:
        new THREE.Matrix4().makeFrustum(-outer, inner, -bottom, top, near, far),
    right:
        new THREE.Matrix4().makeFrustum(-inner, outer, -bottom, top, near, far),
  };
};

// Set barrel_distortion parameters given CardboardView.
CARDBOARD.updateBarrelDistortion = function(barrel_distortion, cardboard_view,
    camera_near, camera_far, show_center) {
  var coefficients = cardboard_view.device.distortion_coefficients;
  // Shader params include parts of the projection matrices needed to
  // convert texture coordinates between distorted and undistorted
  // frustums.  The projections are adjusted to include transform between
  // texture space [0..1] and NDC [-1..1] as well as accounting for the
  // viewport on the screen.
  // TODO: have explicit viewport transform in shader for simplicity
  var projections = CARDBOARD.getProjectionMatrixPair(
      cardboard_view.getLeftEyeFov(), camera_near, camera_far);
  barrel_distortion.uniforms.distortion.value
      .set(coefficients[0], coefficients[1]);
  var elements = projections.left.elements;
  barrel_distortion.uniforms.projectionLeft.value
      .set(elements[4*0 + 0], elements[4*1 + 1],
           elements[4*2 + 0] - 1, elements[4*2 + 1] - 1)
      .divideScalar(2);
  var no_lens_view = cardboard_view.getLeftEyeFovAndViewportNoDistortionCorrection();
  var viewport = no_lens_view.viewport;
  var unprojections = CARDBOARD.getProjectionMatrixPair(
      no_lens_view.fov, camera_near, camera_far);
  elements = unprojections.left.elements;
  var x_scale = viewport.width / (cardboard_view.screen.width / 2);
  var y_scale = viewport.height / cardboard_view.screen.height;
  var x_trans = 2 * (viewport.x + viewport.width / 2) /
      (cardboard_view.screen.width / 2) - 1;
  var y_trans = 2 * (viewport.y + viewport.height / 2) /
      cardboard_view.screen.height - 1;
  barrel_distortion.uniforms.unprojectionLeft.value
      .set(elements[4*0 + 0] * x_scale, elements[4*1 + 1] * y_scale,
           elements[4*2 + 0] - 1 - x_trans, elements[4*2 + 1] - 1 - y_trans)
      .divideScalar(2);
  barrel_distortion.uniforms.showCenter.value = show_center ? 1 : 0;
};

// Manually maintained map from WURFL.js device name to screen PPI
// (assuming square pixels).  An optional match regex can be provided,
// otherwise the key is expected to match exactly.
CARDBOARD.SCREEN_PPI_BY_DEVICE = {
  // Device name                [ PPI, (/Regex/) ]
  'Apple iPhone 6':             [ 326 ],
  'Apple iPhone 6 Plus':        [ 401 ],
  'Google Nexus 5':             [ 445 ],
  'Google Nexus 6':             [ 493 ],
  'Motorola Moto X':            [ 312, / XT10(52|53|55|56|58|60) / ],
  'Samsung Galaxy S III':       [ 306, /\(Galaxy S III\)/ ],
  'Samsung Galaxy S4':          [ 441, /\(Galaxy S4\)/ ],
  'Samsung Galaxy S5':          [ 432, /\(Galaxy S5\)/ ],
};

// Plan for deducing display properties:
//   * use map from vendor/model to database of resolution + density
//   * otherwise prompt user for info and store in cookie
// TODO: move fallback / cookie access out of this library
CARDBOARD.findScreenParams = function() {
  var ppi;
  var ppi_entry = CARDBOARD.SCREEN_PPI_BY_DEVICE[WURFL.complete_device_name];
  if (ppi_entry) {
    ppi = ppi_entry[0];
    console.log('Detected', WURFL.complete_device_name);
  } else {
    // try regex match
    for (var device_name in CARDBOARD.SCREEN_PPI_BY_DEVICE) {
      var ppi_entry = CARDBOARD.SCREEN_PPI_BY_DEVICE[device_name];
      if (ppi_entry.length > 1 &&
          WURFL.complete_device_name.match(ppi_entry[1])) {
        ppi = ppi_entry[0];
        console.log('Detected', device_name);
        break;
      }
    }
  }
  if (WURFL.is_mobile) {
    if (!ppi) {
      console.log('Mobile device display properties unknown:',
          WURFL.complete_device_name);
      ppi = Number(_readCookie('ppi'));
      if (ppi > 0) {
        console.log('PPI from cookie:', ppi);
      } else {
        ppi = Number(window.prompt("Mobile device display properties " +
            "unknown. Enter pixels per inch (PPI) value of your device:"));
        if (ppi > 0) {
          _createCookie(window.location.pathname, 'ppi', ppi, 9999);
        } else {
          ppi = 300;
        }
      }
    }
    var screen_width = Math.max(window.screen.width, window.screen.height) *
        window.devicePixelRatio;
    var screen_height = Math.min(window.screen.width, window.screen.height) *
        window.devicePixelRatio;
    return new CARDBOARD.ScreenParams(screen_width, screen_height, ppi,
        0.003 /*bezel height*/);
  } else {
    // generic values for desktop
    return new CARDBOARD.ScreenParams(1920, 1080, 445, 0);
  }
};

function _createCookie(path, name, value, days) {
  var date = new Date();
  date.setTime(date.getTime()+(days*24*60*60*1000));
  document.cookie = name+"="+value+
      "; expires="+date.toGMTString()+
      "; path="+path;
}

function _readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i=0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) == 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}
