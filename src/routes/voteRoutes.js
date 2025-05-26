const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const passport = require('passport');

const FRONTEND_URL = 'https://front-vfhk.onrender.com'; // адреса фронтенду на Render

// --- API для голосування та категорій ---
router.get('/categories', voteController.getCategories);
router.post('/categories', voteController.createCategory);
router.put('/categories/:categoryId', voteController.updateCategory);
router.delete('/categories/:categoryId', voteController.deleteCategory);

router.get('/categories/random', voteController.getRandomCategory);
router.get('/categories/:categoryId/candidates', voteController.getCandidatesByCategory);
router.post('/categories/:categoryId/candidates', voteController.createCandidate);
router.put('/categories/:categoryId/candidates/:candidateId', voteController.updateCandidate);
router.delete('/categories/:categoryId/candidates/:candidateId', voteController.deleteCandidate);

router.post('/votes', voteController.submitVote);
router.get('/votes/check/:categoryId', voteController.checkIfVoted);
router.get('/stats', voteController.getStats);
router.get('/top-candidate', voteController.getTopCandidate);
router.get('/bottom-candidate', voteController.getBottomCandidate);

// --- Аутентифікація ---
router.get('/auth/twitter', passport.authenticate('twitter'));

router.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/vote`); // Після успішного входу
  }
);

// Facebook OAuth: ініціація входу
router.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

// Facebook OAuth: колбек після входу
router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/vote`); // Перенаправлення на фронт після входу
  }
);

router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/vote`); // перенаправлення після входу
  }
);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/vote`); // Перенаправлення на фронт після входу
  }
);

// --- Отримання поточного користувача ---
router.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// --- Вихід ---
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });

    req.session.destroy(() => {
      res.clearCookie('connect.sid'); // або назву твоєї сесійної cookie
      res.status(200).json({ message: 'Logged out' });
    });
  });
});

module.exports = router;
