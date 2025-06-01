const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware:
app.use(cors());
app.use(express.json());

// Home route:
app.get('/', (req, res) => {
    res.send('This is Hot Jobs server!');
});

// URI:
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q1etiuc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Create jobsCollection:
        const jobsCollection = client.db('Job_wave').collection('jobs');
        // Create applicationsCollection:
        const applicationsCollection = client.db('Job_wave').collection('applications');

        // Get All Jobs 
        app.get('/jobs', async (req, res) => {
            const result = await jobsCollection.find().toArray();
            res.send(result);
        });

        // Get Specific One by Id 
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;

            const result = await jobsCollection.findOne(query = { _id: new ObjectId(id) });
            res.send(result);
        });

        // Insert Job Applications
        app.post('/applications', async (req, res) => {
            const application = req.body;

            const result = await applicationsCollection.insertOne(application);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});