const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ivnezkj.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // my database collections
    const blogsCollection = client.db("assignment-11").collection("blogs");
    // -----------------api end points here -----------------
    // post blogs
    app.post("/blogs", async (req, res) => {
      try {
        const blogsData = req.body;
        console.log(blogsData);
        const result = await blogsCollection.insertOne(blogsData);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// initial get
app.get("/", (req, res) => {
  res.send("assignment 11 server is running");
});

app.listen(port, () => {
  console.log(`assignment in running on port ${port}`);
});
