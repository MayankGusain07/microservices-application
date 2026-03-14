// services/product-service/app.js
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'product-service' });
});

const products = [
  { id: 1, name: 'Laptop',     price: 999.99,  stock: 50  },
  { id: 2, name: 'Headphones', price: 149.99,  stock: 200 },
  { id: 3, name: 'Keyboard',   price: 79.99,   stock: 150 },
];

app.get('/products', (req, res) => res.json(products));

app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.listen(PORT, () => console.log(`Product service running on port ${PORT}`));
