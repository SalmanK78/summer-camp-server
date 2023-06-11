const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.DB_URI

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
    const classesCollection = client.db('summerCamp').collection('classes')
    const usersCollection = client.db('summerCamp').collection('users')
    const selectedCollection = client.db('summerCamp').collection('selected')
    const requestsCollection = client.db('summerCamp').collection('requests')

    app.post('/classes',async(req,res)=>{
      const data = req.body;
      console.log(data.addInfo)
      const result = await classesCollection.insertOne(data.addInfo)
      res.send(result) 
    })
    app.get('/classes',async(req,res)=>{
      const result =await classesCollection.find().toArray()
      res.send(result)
    })
    app.patch('/classes/:id',async(req,res)=>{
      const id = req.params.id
      console.log(id)
      const filter = {_id: new ObjectId(id)}
      const filter2 = {_id: new ObjectId(id)}
      const result = await classesCollection.findOne(filter)
      const selectedItem = await selectedCollection.findOne(filter2)
      console.log({selectedItem})
      const options = { upsert : true }
      const enroll = {
        $set:{
          enroll:parseInt(result?.enroll ?  result.enroll + 1 : 1)
        }
      }
      if(selectedItem){
        const updateSelected = await selectedCollection.updateOne(filter2,enroll,options);
        const updateEnroll = await classesCollection.updateOne(filter,enroll,options);
        res.send({updateEnroll,updateSelected})
      }else{
        const updateEnroll = await classesCollection.updateOne(filter,enroll,options);
        res.send(updateEnroll)
      }
    })
    // instructor added classes
    app.get('/addedclasses',async(req,res)=>{
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await classesCollection.find(query).toArray();
      res.send(result)
    })
    app.delete('/addedclasses/:id' , async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await classesCollection.deleteOne(query)
      res.send(result)
    })
    
    // Users Collection
    app.post('/users',async(req,res)=>{
      const user = req.body;
      console.log(user)
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    //selected Classes
    app.post('/selected',async(req,res)=>{
      const select = req.body;
      const items = select.item
      items.email = req.body.email;
      delete select.item._id
      const result = await selectedCollection.insertOne(items)
      res.send(result)      
    }) 
    
    app.get('/selected', async (req, res) => {
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await selectedCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/selected/:id',async(req,res)=>{
      const id = req.params.id
      console.log(id)
      const query = {_id: new ObjectId(id) }
      const result = await selectedCollection.deleteOne(query)
      res.send(result)
    })

    //Enrolled classes
    app.get('/popular',async(req,res)=>{
      const query = {}
      const options = {
        sort:{"enroll" : -1 }
      }
      const result = await classesCollection.find(query,options).toArray()
      res.send(result)
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
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
})