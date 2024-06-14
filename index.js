const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

//jwt-verify
const jwtVerify = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unAuthorized user" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unAuthorized user" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@cluster0.igfrycv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();

    const userCollection = client.db("dreamItDB").collection("users");
    const classCollection = client.db("dreamItDB").collection("classes");

    //jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    //admin-route
    app.get("/users/admin/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    //teacher-route
    app.get("/users/teacher/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ teacher: false });
      }
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      const result = { teacher: user?.role === "teacher" };
      res.send(result);
    });

    //save-user
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          ...user,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    //user-get
    app.get("/users", jwtVerify, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //add-to-teacher
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          role: "teacher",
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    //user-view-class
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    //all-class-api
    //all-class-by-admin
    app.get("/classes", jwtVerify, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    //all-class-status-by-admin
    app.put("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          status: "active",
        },
      };
      const result = await classCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });
    //add-class
    app.post("/classes", jwtVerify, async (req, res) => {
      const body = req.body;
      const result = await classCollection.insertOne(body);
      res.send(result);
    });
    //get-class
    app.get("/classes/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await classCollection.find(filter).toArray();
      res.send(result);
    });
    //class-update
    app.patch("/classes/:id", jwtVerify, async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          ...body,
        },
      };
      const result = await classCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });
    //class-delete
    app.delete("/classes/:id", jwtVerify, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(filter);
      res.send(result);
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

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
