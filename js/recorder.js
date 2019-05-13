'use strict';

if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {};
}

if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = function (constraints) {
    var getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
    }
    return new Promise((resolve, reject) => {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  }
}

function createThumbnail(video) {
  return new Promise((done, fail) => {
    const preview = document.createElement('video');
    preview.src = URL.createObjectURL(video);
    preview.addEventListener('loadeddata', () => preview.currentTime = 2);
    preview.addEventListener('seeked', () => {
      const snapshot = document.createElement('canvas');
      const context = snapshot.getContext('2d');
      snapshot.width = preview.videoWidth;
      snapshot.height = preview.videoHeight;
      context.drawImage(preview, 0, 0);
      snapshot.toBlob(done);
    });
  });
}


function record(app) {
  return new Promise((done, fail) => {
    app.mode = 'preparing';
    window.navigator.mediaDevices.getUserMedia(app.config)
      .then((stream) => {

        app.mode = 'recording';
        app.preview.srcObject = stream;

        let recorder = new MediaRecorder(stream);

        let chanks = [];
        recorder.addEventListener('dataavailable', (event) => {
          chanks.push(event.data)
        })

        recorder.addEventListener('stop', (event) => {
          const recorded = new Blob(chanks, { 'type': recorder.mimeType })

          chanks = null;
          recorder = stream = null;

          createThumbnail(recorded)
            .then(data => {
              return { 'video': recorded, 'frame': data }
            })
            .then(done)
        })

        setTimeout(() => {
          recorder.start();
        }, 1000)


        setTimeout(() => {
          recorder.stop();
          app.preview.srcObject = null;
          stream.getTracks().forEach(track => track.stop())
        }, app.limit + 1000);

      })
      .catch((er) => {
        console.log(er)
      })
  });
}

