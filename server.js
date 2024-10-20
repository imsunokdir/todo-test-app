const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);

//file imports
const { userDataValidation, isEmailValidate } = require("./utils/authUtil");
const userModel = require("./models/userModel");
const isAuth = require("./middlewares/isAuth");
const todoDataValidation = require("./utils/todoUtils");
const todoModel = require("./models/todoModel");

//constants
const app = express();
const PORT = process.env.PORT;
const upload = multer();
const store = new MongoDBSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

// db connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log(err));

// middlewares
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true })); // To handle form data
app.use(express.json()); // To handle JSON data
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);

app.get("/register-page", (req, res) => {
  return res.render("register");
});

app.get("/login-page", (req, res) => {
  return res.render("login");
});

app.get("/", (req, res) => {
  return res.send("Server is up and running");
});

app.post("/register", async (req, res) => {
  const { name, email, password, username } = req.body;
  //data validation
  //userSchema
  //make sure user and email does not exists
  //store the data in db
  try {
    await userDataValidation({ email, username, password, name });
  } catch (err) {
    return res.status(400).json(err);
  }
  //check if email or username exists
  const userEmailExists = await userModel.findOne({ email });

  if (userEmailExists) {
    return res.status(400).json("email already exists");
  }
  const userUsernameExists = await userModel.findOne({ username });

  if (userUsernameExists) {
    return res.status(400).json("username already exists");
  }

  const hashedPassword = await bcrypt.hash(password, Number(process.env.SALT));

  const userObj = new userModel({
    name,
    email,
    username,
    password: hashedPassword,
  });

  try {
    const userDb = userObj.save();

    // return res.status(201).json({
    //   message: "register successful",
    //   data: userDb,
    // });
    //since we are not using react for user intreface, thats why redirect here
    return res.redirect("/login-page");
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: err,
    });
  }
});

app.post("/login", async (req, res) => {
  //find user with loginId
  //compare password
  // session base auth;

  const { loginId, password } = req.body;
  if (!loginId || !password)
    return res.status(400).json("missing user credentials");

  try {
    let userDb;
    if (isEmailValidate({ key: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }

    if (!userDb)
      return res.status(400).json("user does not exists, register first");

    const isMatched = await bcrypt.compare(password, userDb.password);

    if (!isMatched) return res.status(400).json("password does not match");

    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,
      email: userDb.email,
      username: userDb.username,
    };

    // return res.status(200).json("Login successful");
    return res.redirect("/dashboard");
  } catch (err) {
    return res.status(500).json({
      message: "internal server error",
      error: err,
    });
  }
});

app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboardPage");
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json("logout unsuccessfull");
  });
  // return res.status(200).json("logout successful");
  return res.redirect("/login-page");
});

app.post("/logout-out-from-all", isAuth, async (req, res) => {
  // we need session schema
  // we need session model
  // make model.queries

  const { username } = req.session.user;

  const sessionSchema = new mongoose.Schema({ _id: String }, { strict: false });
  const sessionModel = mongoose.model("session", sessionSchema);

  try {
    const deleteDb = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    console.log(deleteDb);
    // return res.status(200).json("Logout from all devices successful");
    return res.redirect("/login-page");
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: err,
    });
  }
});

//todos api
app.post("/create-item", isAuth, async (req, res) => {
  console.log(req.body);
  const { todo } = req.body;
  const { username } = req.session.user;

  try {
    await todoDataValidation({ todo });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }
  const todoObj = new todoModel({ todo, username });
  try {
    const todoDb = await todoObj.save();
    return res.send({
      status: 201,
      message: "todo created successfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "internal server error",
      error: error,
    });
  }
});

app.get("/read-item", isAuth, async (req, res) => {
  const { username } = req.session.user;
  const SKIP = Number(req.query.skip) || 0;

  try {
    // const todos = await todoModel.find({ username });
    // console.log(todos);
    const todos = await todoModel.aggregate([
      // skip, limit, match
      {
        $match: { username: username },
      },
      {
        $skip: SKIP,
      },
      {
        $limit: 5,
      },
    ]);

    if (todos.length === 0)
      return res.send({ status: 204, message: "No todo's found" });
    return res.send({
      status: 200,
      message: "read successfully",
      data: todos,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.post("/edit-item", isAuth, async (req, res) => {
  const { newData, todoId } = req.body;
  const { username } = req.session.user;
  try {
    await todoDataValidation({ todo: newData });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }

  try {
    const todoDb = await todoModel.findOne({ _id: todoId });
    if (!todoDb)
      return res.send({
        status: 400,
        message: "No todo found",
      });
    console.log(todoDb);
    if (username !== todoDb.username) {
      return res.send({
        status: 403,
        message: "Not allowed to do this todo",
      });
    }

    const updatedTodoDb = await todoModel.findOneAndUpdate(
      { _id: todoId },
      { todo: newData },
      { new: true }
    );

    return res.send({
      status: 200,
      message: "Todo updated successfully",
      data: updatedTodoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "internal server error",
      error: error,
    });
  }
});
app.post("/delete-item", isAuth, async (req, res) => {
  const { todoId } = req.body;
  const { username } = req.session.user;

  if (!todoId) {
    return res.send({
      status: 400,
      message: "Missing todo id",
    });
  }

  try {
    const todoDb = await todoModel.findOne({ _id: todoId });
    if (!todoDb)
      return res.send({
        status: 400,
        message: "No todo found",
      });
    console.log(todoDb);
    if (username !== todoDb.username) {
      return res.send({
        status: 403,
        message: "Not allowed to delete this todo",
      });
    }

    const deletedTodoDb = await todoModel.findOneAndDelete({ _id: todoId });

    return res.send({
      status: 200,
      message: "Todo deleted successfully",
      data: deletedTodoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "internal server error",
      error: error,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at : http://localhost:${PORT}/`);
});
