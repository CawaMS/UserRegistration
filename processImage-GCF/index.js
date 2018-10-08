

// [START functions_helloworld_pubsub_node8]
/**
 * Background Cloud Function to be triggered by Pub/Sub.
 * This function is exported by index.js, and executed when
 * the trigger topic receives a message.
 *
 * @param {object} data The event payload.
 * @param {object} context The event metadata.
 */
exports.imagePubSub = (data, context) => {
    const {Storage} = require('@google-cloud/storage');
    const sharp = require('sharp');
    
    const bucket = "Storage_bucket_name";
    const width = 200;
    const height = 200;
    const option = "!";
    const quality = 90;

  const pubSubMessage = data;
  //const name = pubSubMessage.data ? Buffer.from(pubSubMessage.data, 'base64').toString() : 'World';
  const filename = Buffer.from(pubSubMessage.data, 'base64').toString();

  if(!filename) {
    return;
  }

  console.log(`going to process ${filename}`);

  const storage = new Storage({
    projectId: 'project_id'
  });

  const file = storage.bucket(bucket).file(filename);


  const thumbFileName = `thumb_${filename}`;
  const uploadFile = storage.bucket(bucket).file(thumbFileName);
  const uploadStream = uploadFile.createWriteStream({
    metadata: {
      contentType: "image/jpeg"
    },
    resumable: false
  });

  const pipeline = sharp();
  pipeline
    .resize(width, height)
    .max()
    .pipe(uploadStream);

  file.createReadStream().pipe(pipeline);

  const streamAsPromise = new Promise((resolve, reject) =>
    uploadStream.on('finish', resolve).on('error', reject));

 //  const streamAsPromise = new Promise((resolve,reject) => stream.pipe(pipeline).on('finish', resolve).on('error',reject));
   streamAsPromise.then(() => {
    console.log('Thumbnail created successfully');
    return null;
  });

  console.log('Served (expect full path): ' + file.name);





};
// [END functions_helloworld_pubsub_node8]

