const pool = require('../db');

// Отримання всіх категорій
exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Створення нової категорії
exports.createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Створення нового кандидата в категорії
exports.createCandidate = async (req, res) => {
  const { categoryId } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Candidate name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO candidates (category_id, name) VALUES ($1, $2) RETURNING *',
      [categoryId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Отримання випадкової категорії
exports.getRandomCategory = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY RANDOM() LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No categories found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Отримання кандидатів за категорією
exports.getCandidatesByCategory = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM candidates WHERE category_id = $1',
      [categoryId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Відправлення голосу
exports.submitVote = async (req, res) => {
  const { categoryId, candidateId, userIdentifier } = req.body;
  if (!categoryId || !candidateId || !userIdentifier) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Перевірка, чи користувач уже голосував
    const checkVote = await pool.query(
      'SELECT 1 FROM votes WHERE category_id = $1 AND user_identifier = $2',
      [categoryId, userIdentifier]
    );
    if (checkVote.rows.length > 0) {
      return res.status(400).json({ error: 'Already voted in this category' });
    }

    // Додавання голосу
    await pool.query(
      'INSERT INTO votes (category_id, candidate_id, user_identifier) VALUES ($1, $2, $3)',
      [categoryId, candidateId, userIdentifier]
    );
    // Оновлення кількості голосів кандидата
    await pool.query(
      'UPDATE candidates SET votes = votes + 1 WHERE id = $1',
      [candidateId]
    );
    res.status(201).json({ message: 'Vote submitted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Перевірка, чи користувач голосував
exports.checkIfVoted = async (req, res) => {
  const { categoryId } = req.params;
  const { userIdentifier } = req.query;
  if (!userIdentifier) {
    return res.status(400).json({ error: 'User identifier is required' });
  }
  try {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM votes WHERE category_id = $1 AND user_identifier = $2)',
      [categoryId, userIdentifier]
    );
    res.json({ hasVoted: result.rows[0].exists });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Кандидат із найбільшою кількістю голосів
exports.getTopCandidate = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cand.*, c.name AS category_name
      FROM candidates cand
      JOIN categories c ON cand.category_id = c.id
      ORDER BY cand.votes DESC
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No candidates found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Кандидат із найменшою кількістю голосів
exports.getBottomCandidate = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cand.*, c.name AS category_name
      FROM candidates cand
      JOIN categories c ON cand.category_id = c.id
      ORDER BY cand.votes ASC
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No candidates found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Статистика
exports.getStats = async (req, res) => {
  try {
    // Кількість категорій
    const categoryCount = await pool.query('SELECT COUNT(*) FROM categories');
    const totalCategories = parseInt(categoryCount.rows[0].count);

    // Загальна кількість голосів
    const voteCount = await pool.query('SELECT COUNT(*) FROM votes');
    const totalVotes = parseInt(voteCount.rows[0].count);

    // Категорія з найбільшою кількістю голосів
    const topCategory = await pool.query(`
      SELECT c.name, COUNT(v.id) as vote_count
      FROM categories c
      LEFT JOIN votes v ON c.id = v.category_id
      GROUP BY c.id, c.name
      ORDER BY vote_count DESC
      LIMIT 1
    `);

    res.json({
      totalCategories,
      totalVotes,
      topCategory: topCategory.rows[0] || { name: 'Немає голосів', vote_count: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Видалення категорії (каскадно видаляє кандидатів і голоси)
exports.deleteCategory = async (req, res) => {
  const { categoryId } = req.params;
  try {
    await pool.query('DELETE FROM votes WHERE category_id = $1', [categoryId]);
    await pool.query('DELETE FROM candidates WHERE category_id = $1', [categoryId]);
    await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Видалення кандидата
exports.deleteCandidate = async (req, res) => {
  const { categoryId, candidateId } = req.params;
  try {
    await pool.query('DELETE FROM votes WHERE candidate_id = $1', [candidateId]);
    await pool.query('DELETE FROM candidates WHERE id = $1 AND category_id = $2', [candidateId, categoryId]);
    res.json({ message: 'Candidate deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Додайте до існуючого коду в voteController.js

// Оновлення категорії
exports.updateCategory = async (req, res) => {
  const { categoryId } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, categoryId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Оновлення кандидата
exports.updateCandidate = async (req, res) => {
  const { categoryId, candidateId } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Candidate name is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE candidates SET name = $1 WHERE id = $2 AND category_id = $3 RETURNING *',
      [name, candidateId, categoryId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Відправлення голосу
exports.submitVote = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { categoryId, candidateId } = req.body;
  const userId = req.user.id;
  if (!categoryId || !candidateId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const checkVote = await pool.query(
      'SELECT 1 FROM votes WHERE category_id = $1 AND user_id = $2',
      [categoryId, userId]
    );
    if (checkVote.rows.length > 0) {
      return res.status(400).json({ error: 'Already voted in this category' });
    }

    await pool.query(
      'INSERT INTO votes (category_id, candidate_id, user_id) VALUES ($1, $2, $3)',
      [categoryId, candidateId, userId]
    );
    await pool.query(
      'UPDATE candidates SET votes = votes + 1 WHERE id = $1',
      [candidateId]
    );
    res.status(201).json({ message: 'Vote submitted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Перевірка, чи користувач голосував
exports.checkIfVoted = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { categoryId } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM votes WHERE category_id = $1 AND user_id = $2)',
      [categoryId, userId]
    );
    res.json({ hasVoted: result.rows[0].exists });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};