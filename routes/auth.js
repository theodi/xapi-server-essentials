// authRoutes.js

const express = require('express');
const passport = require('../passport'); // Require the passport module

const { retrieveOrCreateUser } = require('../controllers/user');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

async function processLogin(req, res) {
  try {
    const profile = req.session.passport ? req.session.passport.user : req.session.user;
    const user = await retrieveOrCreateUser(profile);

    // Update last login data
    user.lastLoginFormatted = user.lastLogin.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    user.lastLogin = new Date();
    user.loginCount = user.loginCount + 1;

    // Save the user
    await user.save();

    req.session.passport.user.id = user._id;

  } catch (error) {
    console.log(error);
  }
}

// Authentication route for Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Authentication route for Django
router.get('/django',
  passport.authenticate('django')
);

// Callback endpoint for Google authentication
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/error' }),
  async (req, res) => {
    req.session.authMethod = 'google';
    // Successful authentication, redirect to profile page or wherever needed
    await processLogin(req);
    res.redirect('/auth/profile');
  }
);

// Callback endpoint for Django authentication
router.get('/django/callback',
  passport.authenticate('django', { failureRedirect: '/error' }),
  async (req, res) => {
    req.session.authMethod = 'django';
    await processLogin(req);
    res.redirect('/auth/profile');
  }
);

router.get('/profile', ensureAuthenticated, async (req, res, next) => {
  res.locals.userProfile = await retrieveOrCreateUser(res.locals.user);
  const page = {
    title: "Profile page",
    link: "/profile"
  };
  res.locals.page = page;
  res.render('pages/auth/profile');
});

router.delete('/profile', ensureAuthenticated, async (req, res, next) => {
  try {
      // Get the user ID from the authenticated user
      const userId = req.session.passport.user.id;

      await deleteUser(userId)
      res.status(200).json({ message: "User deleted successfully." });

  } catch (error) {
      next(error);
  }
});

module.exports = router;