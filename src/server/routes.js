const { Router } = require('express');
require('dotenv').config();

const routes = Router();

// paypal config
const paypal = require('paypal-rest-sdk');

const {
  paypal_client_id,
  paypal_client_secret,
} = process.env;

paypal.configure({
  mode: 'sandbox', // Sandbox or live
  client_id: paypal_client_id,
  client_secret: paypal_client_secret
});

// require models
const { User, Pothole } = require('./db/index');
const { saveUser, savePothole, saveDonation } = require('./db/helpers');


routes.post('/potholes', (req, res) => {
  console.log(req);
  savePothole(req.body);
  res.sendStatus(200);
  res.end();
});

// a get route to get a pothole
routes.get('/potholes', (req, res) => {
  console.log('WORKED');
  return Pothole.findAll({
    // where: { severity: 10 }
  })
    .then((pothole) => {
      console.log(pothole);
      res.send(pothole);
      res.end();
    })
    .catch((err) => {
      console.error(err);
      res.send(500);
    });
});

// get route to get a user
routes.get('/users', (req, res) => {
  // save user to db
  // hardcoded user for testing
  User.findAll({
    full_name: 'Avery',
  })
    .then((user) => {
      res.send(user);
      res.sendStatus(201);
    })
    .catch((err) => {
      console.error(err);
      res.send(500);
    });
});
// post route to create a user
routes.post('/users', (req, res) => {
  // save user to db
  console.log(req.body);
  return saveUser(req.body)
    .then((user) => {
      console.log(user);
      saveDonation(user);
      res.sendStatus(201);
      res.end();
    })
    .catch((err) => {
      console.log(err, 'errr');
    });
});


// post route to make a paypal payment
routes.post('/donate', (req, res) => {
  // get payment amount
  const { donation } = req.body;
  // make sure donation is valid
  if (isNaN(+donation) || +donation < 0) {
    console.log('not a valid amount');
    res.send('invalid');
    return;
  }
  // create payment object
  const create_payment_json = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal'
    },
    redirect_urls: {
      return_url: 'http://localhost:8080/success',
      cancel_url: 'http://localhost:8080/cancel'
    },
    transactions: [{
      item_list: {
        items: [{
          name: 'big hole',
          sku: '001',
          currency: 'USD',
          price: donation,
          quantity: 1
        }]
      },
      amount: {
        currency: 'USD',
        total: donation
      },
      description: 'This is the payment description.'
    }]
  };
  // send payment object to paypal
  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      throw error;
    } else {
      // find approval url
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === 'approval_url') {
          // send back url
          res.send(payment.links[i].href);
          // res.redirect(payment.links[i].href);
        }
      }
    }
  });
});

// handle successful payment
routes.get('/success', (req, res) => {
  const payerId = req.query.PayerID;
  const { paymentId } = req.query;

  const execute_payment_json = {
    payer_id: payerId,
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log(JSON.stringify(payment));
      // TODO need to save transaction to db;
      // TODO prompt a toast saying successful payment
      res.redirect('/');
    }
  });
});

// send toast that transaction was canceled
routes.get('/cancel', (req, res) => {
  // TODO - handle toast message
  res.redirect('/');
});

Router.get('/pothole', (req, res) => {
  // req body to include location
  if (!req.body.location) {
    // get single pothole
    // res.send(pothole)
  } else {
    // get pothole from db based on location
  }
});

module.exports = { routes };
