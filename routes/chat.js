var io = require('socket.io-emitter')({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    pass: process.env.REDIS_PASSWORD
  }),
  s3 = require("s3"),
  fs = require("fs"),
  path = require("path"),
  temp_dir = path.join(process.cwd(), '../tmp/'),
  uuid = require('node-uuid');


var s3Client = s3.createClient({
  maxAsyncS3: 20, // this is the default
  s3RetryCount: 3, // this is the default
  s3RetryDelay: 1000, // this is the default
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET
  },
});
exports.ping = function(req, res) {
  if (typeof req.session._user === 'undefined') {
    return res.json({
      success: false,
      error: {
        code: 13,
        message: "Not logged in."
      }
    });
  }
  req.session._user.last_seen = new Date();
  if (req.session._user.online == false) {
    req.session._user.online = true;
    var userStripped = {
      name: req.session._user.name,
      profile: req.session._user.profile.substr(req.session._user.profile.lastIndexOf(".") + 1),
      username: req.session._user.username,
      chatting: req.session._user.chatting,
      owner: req.session._user.owner,
      online: req.session._user.online,
      _id: req.session._user._id
    }
    io.emit('update user', userStripped);
  }
  req.session._user.save(function(err, user) {
    if (err) {
      console.log(err);
      return res.json({
        success: false,
        error: {
          code: 12,
          message: "Unable to save user."
        }
      });
    }
    res.json({
      success: true
    });
  })
}

exports.upload = function(req, res) {
  if (typeof req.session._user === 'undefined') {
    return res.json({
      success: false,
      error: {
        code: 13,
        message: "Not logged in."
      }
    });
  }
  var authorized = false;
  if (req.session._user.admin)
    authorized = true;
  if (req.session._user.owner)
    authorized = true;
  if (!authorized) {
    return res.json({
      success: false,
      error: {
        code: 40,
        message: "Not authorized."
      }
    });
  }
  if (!fs.existsSync(temp_dir))
    fs.mkdirSync(temp_dir);
  var params = {
    localFile: req.files['file']['path'],

    s3Params: {
      Bucket: "zallchat-shared-images",
      Key: Number(new Date()) + "-" + uuid.v4() + ".jpg"
    },
  };
  var uploader = s3Client.uploadFile(params);
  uploader.on('error', function(err) {
    res.json({
      success: false,
      error: {
        code: 41,
        message: "Error uploading."
      }
    });
    console.error("unable to upload:", err.stack);
  });
  uploader.on('progress', function() {
    console.log("progress", uploader.progressMd5Amount,
      uploader.progressAmount, uploader.progressTotal);
  });
  uploader.on('end', function() {
    res.json({
      success: true,
      data: {
        image: params.s3Params.Key
      }
    });
  });
}