const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 8000;
require('dotenv').config()

// middle ware 
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aqgz8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    // Collection 
    const usersCollection = client.db("bistroDB").collection("users");
    const menusCollection = client.db("bistroDB").collection("menu");
    const CartsCollection = client.db("bistroDB").collection("carts");



    // JWT Token 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' })
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })

    }
    // use verify admin after verifyToken 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    // user Collection 
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(req.headers);
      // Check already user exists or not 
      const query = { email: user?.email }
      const existsEmail = await usersCollection.findOne(query)
      if (existsEmail) {
        return res.send({ message: 'User Already Exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })


    // menu related API
    app.get('/menus', async (req, res) => {
      const result = await menusCollection.find().toArray();
      res.send(result)
    })
          // update menus 
    app.get('/menus/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menusCollection.find(query)
      res.send(result);
    })
    app.delete('/menus/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menusCollection.deleteOne(query)
      res.send(result);
    })
    // Carts Collection
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await CartsCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await CartsCollection.insertOne(cartItem)
      res.send(result)
    })
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await CartsCollection.deleteOne(query)
      res.send(result)
    })


      // Admin Status 

      app.get('/admin-stats',async(req,res)=>{
        const user = await usersCollection.estimatedDocumentCount();

        res.send({
          user
        })
      })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})