require('dotenv').config();
const { MongoClient } = require('mongodb');
const { Client } = require('pg');

// MongoDB setup
const mongoUrl = process.env.MONGO_URL; // Example: "mongodb://root:example@mongo:27017/"
const dbName = process.env.MONGO_DB // Adjust as needed
const collectionName = 'products'; // Adjust as needed


console.log("mongoUrl", mongoUrl);
console.log("dbName", dbName);
console.log("collectionName", collectionName);
console.log("process.env.POSTGRES_URL", process.env.POSTGRES_URL);
console.log("process.env.MONGO_URL", process.env.MONGO_URL);
console.log("process.env.MONGO_DB", process.env.MONGO_DB);

const maxRetries = 5; // Maximum number of retries
let retries = 0; // Current retry count



  
  // Example usage
  const mongoUrladm = `${mongoUrl}/?authSource=admin&replicaSet=rs0`;

  async function ensureReplicaSet(mongoUrl) {
    const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });
    try {
      await client.connect();
      const adminDb = client.db('admin');
      
      // Check replica set status
      const status = await adminDb.command({ replSetGetStatus: 1 }).catch(err => err);
      
      if (status.ok === 0) {
        console.log('Initiating replica set...');
        // Initiate replica set if it's not already
        const result = await adminDb.command({
          replSetInitiate: null
        });
        console.log('Replica set initiated:', result);
      } else {
        console.log('MongoDB is already a replica set.');
      }
    } catch (error) {
      console.error('Error ensuring MongoDB is a replica set:', error);
    } finally {
      await client.close();
    }
  }

//ensureReplicaSet(mongoUrladm).catch(console.error);

async function connectToPostgres() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
    });


    while (retries < maxRetries) {
        try {
            await client.connect();
            console.log('Connected to PostgreSQL');
            return client; // Successfully connected
        } catch (err) {
            console.log(`Failed to connect to PostgreSQL, retrying... (${++retries}/${maxRetries})`);
            await new Promise(res => setTimeout(res, 5000)); // Wait for 5 seconds before retrying
        }
    }

    throw new Error('Failed to connect to PostgreSQL after retries');
}

const main = async () => {
    try {

        connectToPostgres().then(async pgClient => {
            console.log('Starting change stream listener')
            console.log(process.env.POSTGRES_URL);
            // Connect to PostgreSQL
   
            // Connect to MongoDB
            console.log(mongoUrl);
            const mongoClient = new MongoClient(process.env.MONGO_URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000, // Lower if you want the timeout to be shorter
                directConnection: true,
              });
            await mongoClient.connect();
            console.log('Connected to MongoDB');
            const db = mongoClient.db(dbName);
            const collection = db.collection(collectionName);
    
            // Listen to change stream
            console.log(`Listening to change stream for collection ${collectionName}`);
            const changeStream = collection.watch();
            changeStream.on('change', async (change) => {
                console.log('Change detected:', change);
                try {
                    if (change.operationType === 'insert') {
                        const { name, price, category } = change.fullDocument;
                        const query = 'INSERT INTO products(name, price, category) VALUES($1, $2, $3)';
                        const values = [name, price, category];
                        await pgClient.query(query, values);
                        console.log(`Inserted item with name: ${name}`);
                    } else if (change.operationType === 'update') {
                        // Assuming the document's unique identifier is included in the updated fields
                        const { documentKey, updateDescription } = change;
                        const id = documentKey._id; // Adjust this line to use your document's unique identifier
                        const updatedFields = updateDescription.updatedFields;
                        const setClauses = [];
                        const values = [];
    
                        for (const [key, value] of Object.entries(updatedFields)) {
                            setClauses.push(`${key} = $${setClauses.length + 1}`);
                            values.push(value);
                        }
    
                        if (setClauses.length > 0) {
                            const query = `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${setClauses.length + 1}`;
                            values.push(id); // Ensure this matches the type and value of your PostgreSQL table's primary key
                            await pgClient.query(query, values);
                            console.log(`Updated item with id: ${id}`);
                        }
                    } else if (change.operationType === 'delete') {
                        const id = change.documentKey._id; // Adjust this line to use your document's unique identifier
                        const query = 'DELETE FROM products WHERE id = $1';
                        await pgClient.query(query, [id]);
                        console.log(`Deleted item with id: ${id}`);
                    }
                } catch (error) {
                    console.error('Error processing change event:', error);
                }
            });
          }).catch(console.error);
 

    } catch (error) {
        console.error('Error:', error);
    }
};

main().catch(console.error);
