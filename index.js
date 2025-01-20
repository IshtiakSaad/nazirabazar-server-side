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

        // Delete a Food
        app.delete('/foods/:id', async (req, res) => {
            const id = req.params.id;
            console.log("Received ID:", id);
            try {
                const query = { '_id': new ObjectId(id) };
                const result = await foodCollection.deleteOne(query);
                console.log("Delete Result:", result);
                res.send(result);
            } catch (error) {
                console.error("Error deleting movie:", error.message);
                res.send({ message: "Failed to delete movie" });
            }
        });

        // User related APIs

        app.post("/users", async (req, res) => {
            const { uid, email, displayName, photoURL } = req.body;

            try {
                const existingUser = await userCollection.findOne({ _id: uid });

                if (existingUser) {
                    await userCollection.updateOne(
                        { _id: uid },
                        {
                            $set: {
                                email,
                                displayName,
                                photoURL,
                            },
                        }
                    );
                    return res.status(200).send({ message: "User updated successfully." });
                }

                const newUser = {
                    _id: uid,
                    email,
                    displayName,
                    photoURL,
                    favoriteFoods: [],
                };

                await userCollection.insertOne(newUser);
                res.status(201).send({ message: "User created successfully." });
            } catch (error) {
                console.error("Error adding/updating user:", error);
                res.status(500).send({ error: "Failed to add/update user." });
            }
        });

        // Fetch from Favorite        
        app.get("/users/:uid/favorites", authenticateJWT, async (req, res) => {

            // console.log("Cookie: ", req.cookies);

            try {
                const { uid } = req.params;

                console.log("User ID received:", uid);

                // Query using string-based _id
                const user = await userCollection.findOne({ _id: uid });
                if (!user) {
                    return res.status(404).send({ error: "User not found." });
                }

                if (!user.favoriteFoods || user.favoriteFoods.length === 0) {
                    return res.status(404).send({ error: "No favorite foods found." });
                }

                const favoriteFoods = await foodCollection
                    .find({
                        _id: { $in: user.favoriteFoods.map((food) => new ObjectId(food.foodId)) },
                    })
                    .toArray();

                res.send(favoriteFoods);
                console.log("Favorite Foods:", favoriteFoods);
            } catch (error) {
                console.error("Error fetching requested foods:", error);
                res.status(500).send({ error: "Failed to fetch requested foods..." });
            }
        });


        // Add to Favorite        
        app.post("/users/:uid/favorites", async (req, res) => {
            const { uid } = req.params;
            const options = { upsert: true };
            const { foodId } = req.body;

            console.log(foodId);
            try {
                const result = await userCollection.updateOne(
                    { _id: uid },
                    { $addToSet: { favoriteFoods: foodId } },
                    options

                );
                res.send(result);

            } catch (error) {
                console.error("Error adding to favorites:", error);
                res.status(500).send({ error: "Failed to add food to favorites." });
            }
        });

        // Delete from Favorite
        app.delete("/users/:uid/favorites/:foodId", async (req, res) => {
            const { uid, foodId } = req.params;

            try {
                const result = await userCollection.updateOne(
                    { _id: uid },
                    { $pull: { favoriteFoods: foodId } }
                );

                if (result.modifiedCount === 0) {
                    return res.status(404).send({ error: "User not found or food not in favorites." });
                }

                res.status(200).send({ message: "food removed from favorites." });
            } catch (error) {
                console.error("Error removing favorite food:", error);
                res.status(500).send({ error: "Failed to remove food from favorites." });
            }
        });

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
