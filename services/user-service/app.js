// services/user-service/app.js
// Simple Express microservice — User management

const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Health check — Kubernetes uses this to know the pod is alive
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// Mock data (replace with a real DB later)
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com'   },
];

app.get('/users', (req, res) => {
  res.json(users);
});

app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  const newUser = { id: users.length + 1, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
