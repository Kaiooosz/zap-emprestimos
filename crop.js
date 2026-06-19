const sharp = require('sharp');
sharp('public/logo-zap-semfundo.png')
  .extract({ left: 130, top: 0, width: 370, height: 160 }) // Adjust these based on image dimensions
  .toFile('public/logo-zap-text-only.png')
  .then(info => console.log('Cropped successfully', info))
  .catch(err => console.error('Error cropping', err));
