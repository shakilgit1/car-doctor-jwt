const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
   origin: [
    'http://localhost:5173',
  //   'https://doctor-website-d3386.web.app',
  //  'https://doctor-website-d3386.firebaseapp.com'
  ],
   credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xvn4ffv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleware
const logger = async(req, res, next) =>{
  console.log('logger from', req.method, req.url)
  next();
}

const verifyToken = async(req, res, next) =>{
  const token = req?.cookies?.token;
  // console.log('vale of middleware token', token);
  if(!token){
    return res.status(401).send({message: 'not authorized'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      // console.log(err);
      return res.status(401).send({message: 'Unauthorized'})
    }
    // console.log('value in the token', decoded);
    req.user = decoded;
    next();
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db('carDoctor').collection('bookings');


    // jwt related api
    app.post('/jwt', logger, async(req, res) => {
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true});
    })

    app.post('/logout', async(req, res) =>{
      const user = req.body;
      console.log('logout user', user);
      res.clearCookie('token', {maxAge: 0}).send({success:true});
    })

    // 
    app.get('/services', async(req, res) =>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })
    app.get('/services/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const options = {
            // Include only the `title` and `imdb` fields in each returned document
            projection: {title: 1, price: 1, service_id: 1, img: 1 },
          };
        const result = await serviceCollection.findOne(query, options);
        res.send(result);
    })
    
    // bookings
    app.post('/bookings', async(req, res) =>{
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
    })
    app.get('/bookings', logger, verifyToken, async(req, res) =>{
        // console.log('cokies cook', req.cookies)
        console.log('owner info', req.user);

        if(req.user.email !== req.query.email ){
          res.status(403).send({message: 'forbidden access'})
        }
        let query = {};
        if(req.query?.email){
            query = {email: req.query.email}
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
    })
    app.patch('/bookings/:id', async(req, res) =>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedBooking = req.body;
        const updateDoc = {
            $set: {
              status: updatedBooking.status
            },
          };
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
    })
    app.delete('/bookings/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('doctor website running');
})
app.listen(port, () =>{
    console.log(`car doctor website running on ${port}`);
})