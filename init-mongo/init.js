db.createUser({
    user: 'myuser',
    pwd: 'password',
    roles: [
      {
        role: 'readWrite',
        db: 'mydatabase',
      },
    ],
  });
  
  db = new Mongo().getDB("mydatabase");
  
  db.products.insert([
    { name: "Product 1", price: 10.99, category: "Category 1" },
    { name: "Product 2", price: 13.99, category: "Category 2" },
    // Add more sample data as needed
  ]);
  