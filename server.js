const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const voteRoutes = require('./src/routes/voteRoutes');
const pool = require('./src/db');

dotenv.config(); // Завантаження змінних середовища

const app = express();

// Налаштування CORS з підтримкою credentials
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

require('./src/config/passport'); // Конфігурація стратегій

// Маршрут колбеку Google
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Після успішної авторизації редіректимось на фронт
    res.redirect('http://localhost:3000/vote');
  }
);

// Основні API маршрути
app.use('/api', voteRoutes);

app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});


// Перевірка з’єднання з базою
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DB Connection Error:', err.stack);
  } else {
    console.log('DB Connected Successfully:', res.rows[0]);
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
  console.log(Server running on port ${PORT});
});
