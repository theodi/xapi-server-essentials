const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Load environment variables securely
require("dotenv").config({ path: "./config.env" });

// MongoDB setup
const mongoose = require('mongoose');

// Read MongoDB URI and database name from environment variables
const mongoURI = process.env.MONGO_URI;
const mongoDB = process.env.MONGO_DB;

const express = require('express');
const session = require('express-session');
const passport = require('./passport'); // Require the passport module
const authRoutes = require('./routes/auth'); // Require the authentication routes module
const authorityRoutes = require('./routes/authorities');
const clientRoutes = require('./routes/clients');
const xAPIRoutes = require('./routes/xAPI');

const app = express();
const port = process.env.PORT || 3080;
app.set('view engine', 'ejs');
app.use(cors());

// Connect to MongoDB
mongoose.connect(mongoURI, { dbName: mongoDB });

const db = mongoose.connection;

// Check MongoDB connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB database");
});

// Middleware for logging
const logger = require('morgan');
// Only log requests that do not start with /xAPI
app.use((req, res, next) => {
  if (!req.url.startsWith('/xAPI')) {
      logger('dev')(req, res, next);
  } else {
      next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Other middleware and setup code...

// Session configuration
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
}));

// Middleware for user object

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  res.locals.user = req.session.passport ? req.session.passport.user : req.session.user;
  next();
});

app.use((req, res, next) => {
  // Read package.json file
  fs.readFile(path.join(__dirname, 'package.json'), 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading package.json:', err);
          return next();
      }

      try {
          const packageJson = JSON.parse(data);
          // Extract version from package.json
          var software = {};
          software.version = packageJson.version;
          software.homepage = packageJson.homepage;
          software.versionLink = packageJson.homepage + "/releases/tag/v" + packageJson.version;
          res.locals.software = software;
      } catch (error) {
          console.error('Error parsing package.json:', error);
      }

      next();
  });
});

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
  res.setHeader('Pragma', 'no-cache'); // HTTP 1.0.
  res.setHeader('Expires', '0'); // Proxies.
  next();
});

// Logout route
app.post('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Middleware to ensure authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
    return next();
  else
    unauthorised(res);
}

function unauthorised(res) {
  const page = {
    title: "Error"
  };
  res.locals.page = page;
  const error = new Error("Unauthorized access");
  error.status = 401;
  throw error;
}

app.use('/xAPI', xAPIRoutes);
app.use('/authorities', authorityRoutes);
app.use('/clients', clientRoutes);

app.use(express.static(__dirname + '/public')); // Public directory

// Use authentication routes
app.use('/auth', authRoutes);

app.get('/admin', function(req,res) {
  res.redirect('/auth/google');
});

app.get('/', function(req, res) {
  const page = {
    title: "Home",
    link: "/"
  };
  res.locals.page = page;
  res.render('pages/home');
});

app.get('/about', function(req, res) {
  const page = {
    title: "About",
    link: "/about"
  };
  res.locals.page = page;
  res.render('pages/about');
});

app.use(ensureAuthenticated, express.static(__dirname + '/private'));

// Error handling
app.get('/error', (req, res) => res.send("error logging in"));

app.get('*', function(req, res, next){
  const page = {
    title: "404 Not Found"
  };
  res.locals.page = page;
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.log('in error');
  console.log(err);
  // Default status code for unhandled errors
  let statusCode = 500;
  let errorMessage = "Internal Server Error";
  // Check if the error has a specific status code and message
  if (err.status) {
      statusCode = err.status;
      errorMessage = err.message;
  }
  const page = {
    title: "Error"
  };
  res.locals.page = page;

  // Log the error stack trace
  //console.error(err.stack);

  // Content negotiation based on request Accept header
  const acceptHeader = req.get('Accept');

  if (acceptHeader === 'application/json') {
      // Respond with JSON
      res.status(statusCode).json({ message: errorMessage });
  } else {
      // Respond with HTML (rendering an error page)
      res.status(statusCode).render('errors/error', { statusCode, errorMessage });
  }
});

// Start server
app.listen(port , () => console.log('App listening on port ' + port));