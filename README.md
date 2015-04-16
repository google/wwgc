Viewer profile generator
==================================

The viewer profile generator is a tool for deriving the viewer
device profile used by [Google Cardboard](https://www.google.com/get/cardboard/) SDK's.
You can use this tool if you're creating a Google Cardboard-inspired device
with different optics, inputs or dimensions.

[Open the running version of the tool](https://www.google.com/get/cardboard/viewerprofilegenerator.html)
or read the [user guide](docs/HELP.md) for more information.

Development
========================

Overview
--------

The tool assists you in deriving the set of parameters needed
to define a viewer device for use by Cardboard SDK's.  Some parameters are
a simple matter of entering text in a form (e.g. for vendor name),
while others require interactive calibration while looking at a scene
within the viewer (e.g. for distortion correction). Therefore the tool has two
components: 1) form entry and instructions running on a PC or laptop having a
keyboard, and 2) a remote 3D scene running on a phone placed into your viewer.
The two components sync data in real-time via the Firebase service, allowing
the rendering parameters to be updated dynamically as you change fields in
the form.

The result is a Cardboard device URI which you can use to generate
QR codes or NFC tags by which users can pair your viewer with their
mobile phone or other device.

Web app approach
----------------

The profile generator also happens to be a proof of concept for making a web
VR app which works with Cardboard, notably implementing stereo view
and distortion correction equivalent to the Cardboard Java SDK for Android.
It only requires a browser with proper WebGL support.  The top level inputs
required for correct rendering are 1) a Cardboard viewer profile, and
2) an accurate pixel-per-inch (PPI) value for the display screen.

However, there are also a number of limitations to this approach:

  * Chrome for Android doesn't support full screen.  See
    https://code.google.com/p/chromium/issues/detail?id=378412
  * No way to get physical screen properties. See the following enlightening rant:
    [Let's get physical (units)](http://smus.com/physical-units/).
  * Magnets may cause orientation drift problems -
    The Android Chrome implementation of HTML5 orientation API
    uses the magnetometer.  If your viewer incorporates magnets, e.g. as
    a button trigger, it may cause tracking problems.  (The iOS
    browser doesn't use the magnetometer for orientation.)
  * No access to Cardboard-style magnet trigger.
  * Distortion correction pass precludes use of antialiasing -
    the multisampled renderbuffers promised with WebGL 2 will
    address this properly.  In the meantime it's possible to
    [antialias in the shader](https://github.com/mrdoob/three.js/blob/master/examples/js/shaders/FXAAShader.js).

This implementation of Cardboard rendering is built on the three.js
framework. If you're interested, see the Cardboard*.js source files.

Running your own instance
-------------------------

Most viewer manufacturers can use the instance of the profile generator
running [here](https://www.google.com/get/cardboard/viewerprofilegenerator.html).
However, if you'd like to run your own instance, it's almost trivial. The web files can be served
statically, but you'll need to edit the `config.js` source file to point
to your own Firebase account and Google API key.

See `firebase-security-rules.json` for an access control example.
