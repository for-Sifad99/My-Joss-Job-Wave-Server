const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const admin = require("firebase-admin");
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware:
app.use(cors({
    origin: ['http://localhost:5173'], //Client Side Origin
    credentials: true //Allow Cookie
}));
app.use(express.json());
app.use(cookieParser());

// Firebase Admin Setup:
const serviceAccount = require('./FB-admin-key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Custom Middleware (JWT TOKEN) :
const verifyJWTtoken = (req, res, next) => {
    const token = req?.cookies?.token;
    // If user not pass the token
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access!' });
    };

    // Verify token
    jwt.verify(token, process.env.JWT_ACCESS_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized Access!' });
        };

        req.decoded = decoded;
        next();
    });
};

// (FIREBASE TOKEN) :
const verifyFBToken = async (req, res, next) => {
    const authHeader = req?.headers?.authorization;
    console.log(authHeader);
    const token = authHeader.split(' ')[1];
    // If user not pass the token
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access!' });
    };

    const tokenInfo = await admin.auth().verifyIdToken(token);
    req.tokenEmail = tokenInfo.email;
    next();
};

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

        // JWT Token Api
        app.post('/jwt', async (req, res) => {
            const payload = req.body;

            // Create JWT Token
            const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET_KEY, { expiresIn: '1d' });

            // Set JWT Token in Cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            });

            res.send({ success: true });
        });

        // Get Jobs by filtering
        app.get('/jobs', async (req, res) => {
            const email = req.query.email;

            const query = {};
            if (email) {
                query.hr_email = email;
            }
            const result = await jobsCollection.find(query).toArray();
            res.send(result);
        });

        // Insert New Job
        app.post('/jobs', async (req, res) => {
            const newJob = req.body;

            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        });

        // Get Job for Aggregate
        app.get('/jobs/applications', async (req, res) => {
            const email = req.query.email;

            const jobs = await jobsCollection.find({ hr_email: email }).toArray();

            // ❌BAD Way to Aggregate Data
            for (const job of jobs) {
                const application_count = await applicationsCollection.countDocuments({ jobId: job._id.toString() });
                job.count = application_count;
            };

            res.send(jobs);
        });

        // Get Specific One by Id 
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;

            const result = await jobsCollection.findOne(query = { _id: new ObjectId(id) });
            res.send(result);
        });

        // Get Job Applications By User Email (Query system)
        app.get('/applications', verifyJWTtoken, verifyFBToken, async (req, res) => {
            const email = req.query.email;

            // Check Access JWT Token
            if (email != req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden Access!' });
            };

            // Check Access FB Token
            if (email != req.tokenEmail) {
                return res.status(403).send({ message: 'Forbidden Access!' });
            };

            const applications = await applicationsCollection.find({ applicantEmail: email }).toArray();

            // ❌BAD Way to Aggregate Data
            for (const application of applications) {
                const jobId = application.jobId;

                const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) });
                application.title = job.title;
                application.location = job.location;
                application.jobType = job.jobType;
                application.category = job.category;
                application.salaryRange = job.salaryRange;
                application.description = job.description;
                application.company = job.company;
                application.company_logo = job.company_logo;
            }

            res.send(applications);
        });

        // Insert Job Applications
        app.post('/applications', async (req, res) => {
            const application = req.body;

            const result = await applicationsCollection.insertOne(application);
            res.send(result);
        });

        // Get ALl Similar Posted Job that Match by Id
        app.get('/applications/job/:jobId', async (req, res) => {
            const job_id = req.params.jobId;

            const result = await applicationsCollection.find({ jobId: job_id }).toArray();
            res.send(result);
        })

        // Update Applications Status by Id
        app.patch('/applications/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDocs = {
                $set: {
                    status: req.body.status
                }
            };

            const result = await applicationsCollection.updateOne(filter, updatedDocs);
            res.send(result);
        })

        // Delete Job Application By Id 
        app.delete('/applications/:id', async (req, res) => {
            const id = req.params.id;

            const result = await applicationsCollection.deleteOne({ _id: new ObjectId(id) });
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