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
        app.get('/applications', async (req, res) => {
            const email = req.query.email;

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