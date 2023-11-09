const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ivnezkj.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//my custom middlewares
const logger = (req, res, next) => {
  console.log("log: info", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log("token in middleware", token);
  // no token available
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // my database collections
    const blogsCollection = client.db("assignment-11").collection("blogs");
    const commentsCollection = client
      .db("assignment-11")
      .collection("comments");
    const wishlistCollection = client
      .db("assignment-11")
      .collection("wishlist");
    // -----------------api end points here -----------------
    // -------auth related api----------
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    // clear cookie
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // -------blogs related api---------
    // get all blogs
    app.post("/allblogs", async (req, res) => {
      try {
        const data = req.body;
        if (data.selectedCategory === "all") {
          const result = await blogsCollection
            .find()
            .sort({ createdAt: -1 })
            .toArray();
          //   console.log(result);
          res.send(result);
        } else {
          const query = {
            category: data.selectedCategory,
          };
          const result = await blogsCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
          //   console.log(result);
          res.send(result);
        }
      } catch (error) {
        console.log(error);
      }
    });
    // get all blogs for featured blogs
    app.get("/featuredblogs", async (req, res) => {
      try {
        const result = await blogsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // get latest blogs
    app.get("/blogs", async (req, res) => {
      try {
        const result = await blogsCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();
        // console.log(result);
        res.send(result);
      } catch (error) {
        console.log(error);
        // res.send(error);
      }
    });
    // get blog details
    app.get("/allblogs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log("all blogs", id);
        const query = { _id: new ObjectId(id) };
        const result = await blogsCollection.findOne(query);
        console.log("all blogs", result);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // get comments based on blog_id
    app.get("/comments/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { blog_id: id };
        const result = await commentsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // put/update the blogs data
    app.put("/updatedblogs/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBlogData = req.body;
      //   const filter = { _id: new ObjectId(id) };
      //   const options = { upsert: true };
      try {
        const result = await blogsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedBlogData },
          { upsert: true }
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // post blogs
    app.post("/blogs", async (req, res) => {
      try {
        const blogsData = req.body;
        // console.log(blogsData);
        const result = await blogsCollection.insertOne(blogsData);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });
    // post comments
    app.post("/comments", async (req, res) => {
      try {
        const commentsData = req.body;
        // console.log("comments data", data);
        const result = await commentsCollection.insertOne(commentsData);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // get wishlist data based on email
    app.get("/wishlist", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("token owner", req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    // delete wishlist
    app.delete("/wishlist/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await wishlistCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // post wishlist data
    app.post("/wishlist", async (req, res) => {
      try {
        const wishlistData = req.body;
        // console.log(wishlistData);
        const result = await wishlistCollection.insertOne(wishlistData);
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
