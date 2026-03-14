// services/order-service/app.js
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

const orders = [];

app.get('/orders', (req, res) => res.json(orders));

app.post('/orders', (req, res) => {
  const { userId, productId, quantity } = req.body;
  const order = {
    id:        orders.length + 1,
    userId,
    productId,
    quantity,
    status:    'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

app.patch('/orders/:id/status', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = req.body.status;
  res.json(order);
});

app.listen(PORT, () => console.log(`Order service running on port ${PORT}`));
