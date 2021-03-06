// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const images = require('../lib/images');
const winston = require('../config/winston');

function getModel () {
  return require(`./model-${require('../config').get('DATA_BACKEND')}`);
}

const router = express.Router();

// Automatically parse request body as form data
router.use(bodyParser.urlencoded({ extended: false }));

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

/**
 * GET /users
 *
 * Display a page of users (up to ten at a time).
 */
router.get('/', (req, res, next) => {
  getModel().list(10, req.query.pageToken, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }
    res.render('users/list.pug', {
      users: entities,
      nextPageToken: cursor
    });
  });
});

/**
 * GET /users/add
 *
 * Display a form for creating a user.
 */
router.get('/add', (req, res) => {
  res.render('users/form.pug', {
    user: {},
    action: 'Add'
  });
});

/**
 * POST /users/add
 *
 * Create a user.
 */
// [START add]
router.post(
  '/add',
  images.multer.single('image'),
  images.sendUploadToGCS,
  (req, res, next) => {
    let data = req.body;

    var address = data.description.toLowerCase();
    if(address == "zoo")
    {
      winston.log('error', " invalid address provided. Need street address");
      res.statusCode = 500;
      console.error(new Error('Whoops, something bad happened'));
      res.send( { error: "Internal Server Error"} );
      return;
    }

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      data.imageUrl = req.file.cloudStoragePublicUrl;
    }

    // Save the data to the database.
    getModel().create(data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);
// [END add]

/**
 * GET /users/:id/edit
 *
 * Display a user for editing.
 */
router.get('/:user/edit', (req, res, next) => {
  getModel().read(req.params.user, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('users/form.pug', {
      user: entity,
      action: 'Edit'
    });
  });
});

/**
 * POST /users/:id/edit
 *
 * Update a user.
 */
router.post(
  '/:user/edit',
  images.multer.single('image'),
  images.sendUploadToGCS,
  (req, res, next) => {
    let data = req.body;

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      req.body.imageUrl = req.file.cloudStoragePublicUrl;
    }

    getModel().update(req.params.user, data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);

/**
 * GET /users/:id
 *
 * Display a user.
 */
router.get('/:user', (req, res, next) => {
  getModel().read(req.params.user, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('users/view.pug', {
      user: entity
    });
  });
});

/**
 * GET /users/:id/delete
 *
 * Delete a user.
 */
router.get('/:user/delete', (req, res, next) => {
  getModel().delete(req.params.user, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
});

/**
 * Errors on "/users/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;
