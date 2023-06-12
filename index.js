const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const stripe = require('stripe')(process.env.PAYMENT_KEY)
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
    const classRequestsCollection = client.db('summerCamp').collection('classRequests')
    const paymentCollection = client.db('summerCamp').collection('payment')

    app.post('/classes',async(req,res)=>{
      const data = req.body;
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
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query);
      console.log(user)
      if (existingUser){
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })
    app.get('/users',async(req,res)=>{
      

      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    app.delete('/users/:email',async(req,res)=>{
      const email = req.params.email
      const query = {email:email}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/user/instructor/:email',async(req,res)=>{
      const email = req.params.email
      const query = {email:email}
      const user = await usersCollection.findOne(query)
      const result = {instructor:user?.role === 'instructor'}
      res.send(result)
    })
    app.get('/instructors',async(req,res)=>{
      const query = {role:'instructor'}
      const result = await usersCollection.find(query).toArray(); 
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

    // Instructor requests
    app.post('/requests',async(req,res)=>{
      const data = req.body
      const request = data.reqInfo
      request.status = 'pending'
      console.log(request)
      const result = await requestsCollection.insertOne(data.reqInfo);
      res.send(result)
    })
    app.get('/requests',async(req,res)=>{
      const result = await requestsCollection.find().toArray();
      res.send(result)
    })
    app.delete('/requests/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await requestsCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/pending/:email',async(req,res)=>{
      const email = req.params.email
      const query = {email:email}
      const result = await requestsCollection.findOne(query)
      console.log(result)
      res.send(result)
    }) 
    app.post('/classrequests',async(req,res)=>{
      const data = req.body
      const request = data.reqInfo
      request.status = 'pending'
      const result = await classRequestsCollection.insertOne(data.reqInfo);
      res.send(result)
    })
    app.get('/classrequests',async(req,res)=>{
      const result = await classRequestsCollection.find().toArray()
      res.send(result)
    })
    app.post('/accptedclasses',async(req,res)=>{
      const data = req.body.data
      data.status = 'accepted'
      console.log(data)
      const query = {_id:new ObjectId(data._id)}
      const deleteResult = await classRequestsCollection.deleteOne(query)
      const result = await classesCollection.insertOne(data)
      res.send(result)
    })
    app.delete('/accptedclasses/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await classRequestsCollection.deleteOne(query)
      res.send(result)
    })

    // Accpeted Requests
    app.post('/accpted',async(req,res)=>{
      const item = req.body;
      const user = item.data
      delete user._id
      user.status = 'accepted'
      user.role = "instructor"
      console.log(user)
      const query = {email:user.email}
      const deleteUser = await usersCollection.deleteOne(query)
      const result = await usersCollection.insertOne(user)
      const deletereq = await requestsCollection.deleteOne(query)
      res.send({deleteUser,result,deletereq}) 
    })


    //Admin
    app.patch('/isadmin/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.get('/user/admin/:email',async(req,res)=>{
      const email = req.params.email
      const query = {email:email}
      const user = await usersCollection.findOne(query)
      const result = {admin:user?.role === 'admin'}
      res.send(result)
    })
    app.get('/userstatus/:email',async(req,res)=>{
      const email = req.params.email
      const query = {email:email}
      const user = await usersCollection.findOne(query)
      console.log(user)
      res.send(user)
    })
    

    // Payment 
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    app.post('/payment',async(req,res)=>{
      const payment = req.body;
      console.log(payment)
      const result = await paymentCollection.insertOne(payment);
      const query = {_id:{$in:payment.itemsId.map(id=>new ObjectId(id))}}
      const delet = await selectedCollection.deleteMany(query)
      res.send(result)
    })
    app.get('/payment/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email:email}
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    })
    app.delete('/payment/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await paymentCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/allpayments',async(req,res)=>{
      const result = await paymentCollection.find().toArray()
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