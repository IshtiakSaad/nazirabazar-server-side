const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.gkupt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const database = client.db("Foodbank");
        const foodCollection = database.collection("foods");
        const userCollection = database.collection("users");

        // CREATE a new Food
        app.post('/foods', async (req, res) => {
            const food = req.body;
            try {
                const result = await foodCollection.insertOne(food);
                res.send(result);
            } catch (error) {
                console.error("Error inserting food:", error.message);
                res.send({ message: "Failed to insert food" });
            }
        });

        // READ all Foods
        app.get('/foods', async (req, res) => {
            try {
                const cursor = foodCollection.find();
                const result = await cursor.toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching foods:", error.message);
                res.send({ message: "Failed to fetch foods" });
            }
        });

        // READ single Food details
        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            try {
                const food = await foodCollection.findOne(query);
                res.json(food);
                console.log(res);
            } catch (error) {
                res.status(500).send({ message: "Error fetching food details" });
            }
        });


        // Update a food
        app.put('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedFood = req.body;

            const food = {
                $set: {
                    foodName: updatedFood.foodName,
                    foodImage: updatedFood.foodImage,
                    foodQuantity: updatedFood.foodQuantity,
                    pickupLocation: updatedFood.pickupLocation,
                    expiredDateTime: updatedFood.expiredDateTime,
                    additionalNotes: updatedFood.additionalNotes,
                    foodStatus: updatedFood.foodStatus,
                },
            };

            try {
                const result = await foodCollection.updateOne(filter, food, options);
                res.send(result);
            } catch (error) {
                res.send({ error: "Error updating Food Details" });
            };
        })


        // await client.connect();
        // await client.db("admin").command({ ping: 1 });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// Default Route
app.get('/', (req, res) => {
    res.send('Food is falling from the Sky');
});

// Start the Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
