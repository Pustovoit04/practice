const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const voteRoutes = require('./src/routes/voteRoutes');
const pool = require('./src/db');

dotenv.config(); // Завантаження змінних середовища

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_ORIGIN = isProduction
  ? 'https://front-vfhk.onrender.com' // ваш домен фронтенду
  : 'http://localhost:3000';

// Налаштування CORS з підтримкою credentials
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,          // HTTPS для продакшну
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax' // для cross-site cookies
  }
}));

app.use(passport.initialize());
app.use(passport.session());

require('./src/config/passport'); // Конфігурація стратегій

// Маршрут колбеку Google
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Редірект на фронтенд після авторизації
    res.redirect(`${FRONTEND_ORIGIN}/vote`);
  }
);

// API маршрути
app.use('/api', voteRoutes);

app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// Перевірка з’єднання з базою
pool.query('SELECT NOW()', (err, dbRes) => {
  if (err) {
    console.error('DB Connection Error:', err.stack);
  } else {
    console.log('DB Connected Successfully:', dbRes.rows[0]);
  }
});

// Обробка помилок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Щось пішло не так на сервері' });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
