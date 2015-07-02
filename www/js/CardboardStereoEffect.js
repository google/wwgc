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

 /* globals: THREE, CARDBOARD */

 THREE.CardboardStereoEffect = function (
  cardboard_view, scene, camera, overrideMaterial, clearColor, clearAlpha ) {

  this.cardboard_view = cardboard_view;
  this.scene = scene;
  this.camera = camera;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 1;

  this.oldClearColor = new THREE.Color();
  this.oldClearAlpha = 1;

  this.enabled = true;
  this.clear = true;
  this.needsSwap = false;

  // Stereo
  var scope = this;

  this.eyeSeparation = cardboard_view.device.inter_lens_distance;

  Object.defineProperties( this, {
    separation: {
      get: function () {
        return scope.eyeSeparation;
      },
      set: function ( value ) {
        console.warn( 'THREE.StereoEffect: .separation is now .eyeSeparation.' );
        scope.eyeSeparation = value;
      }
    },
    targetDistance: {
      get: function () {
        return scope.focalLength;
      },
      set: function ( value ) {
        console.warn( 'THREE.StereoEffect: .targetDistance is now .focalLength.' );
        scope.focalLength = value;
      }
    }
  } );

  // internals

  var _position = new THREE.Vector3();
  var _quaternion = new THREE.Quaternion();
  var _scale = new THREE.Vector3();

  var _cameraL = new THREE.PerspectiveCamera();
  var _cameraR = new THREE.PerspectiveCamera();

  // initialization
  renderer.autoClear = false;

  this.render = function (renderer, writeBuffer, readBuffer, delta) {
    var _width = readBuffer.width  / 2;
    var _height = readBuffer.height;

    this.scene.overrideMaterial = this.overrideMaterial;

    if ( this.clearColor ) {
      this.oldClearColor.copy( renderer.getClearColor() );
      this.oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    // begin StereoEffect
    scene.updateMatrixWorld();

    if ( camera.parent === undefined ) camera.updateMatrixWorld();

    camera.matrixWorld.decompose( _position, _quaternion, _scale );

    this.eyeSeparation = this.cardboard_view.device.inter_lens_distance;

    var projections = CARDBOARD.getProjectionMatrixPair(
      this.cardboard_view.getLeftEyeFov(), camera.near, camera.far);

    // left
    _cameraL.projectionMatrix.copy(projections.left);
    _cameraL.position.copy( _position );
    _cameraL.quaternion.copy( _quaternion );
    _cameraL.translateX( - this.eyeSeparation / 2.0 );

    // right
    _cameraR.projectionMatrix.copy(projections.right);
    _cameraR.position.copy( _position );
    _cameraR.quaternion.copy( _quaternion );
    _cameraR.translateX( this.eyeSeparation / 2.0 );

    renderer.clear();
    renderer.enableScissorTest( true );

    // Viewport can be changed during setRenderTarget call
    // (which gets called from render() function).  Bug?
    renderer.setRenderTarget(readBuffer);

    renderer.setScissor( 0, 0, _width, _height);
    renderer.setViewport( 0, 0, _width, _height);
    renderer.render( scene, _cameraL, readBuffer, this.clear );

    renderer.setScissor( _width, 0, _width, _height );
    renderer.setViewport( _width, 0, _width, _height );
    renderer.render( scene, _cameraR, readBuffer, this.clear );

    renderer.setViewport(0, 0, 2 * _width, _height);

    renderer.enableScissorTest( false );
    // end StereoEffect

    if ( this.clearColor ) {
      renderer.setClearColor( this.oldClearColor, this.oldClearAlpha );
    }

    this.scene.overrideMaterial = null;
  };
};
