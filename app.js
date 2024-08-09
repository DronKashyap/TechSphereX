const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const {User,Blog} = require('./Models/User');
const z = require('zod');
const bodyParser = require('body-parser');
const jwt=require('jsonwebtoken');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 3000 ;
 // adding env variables:
const mongourl=process.env.MONGO_URL;
const secret=process.env.JWT_SECRET;

// Connect to MongoDB
mongoose.connect(`${mongourl}`)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/views'));
app.use('/static', express.static(path.join(__dirname, 'static')));

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

// Set up session middleware
app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: true
}));

function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
}

// Schema validation with Zod
const newUserSchema = z.object({
  Fullname: z.string(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(50),
});

// Routes
app.get('/', (req, res) => {
  res.render("index.ejs");
});

app.get('/myprofile', requireLogin, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.session.username });

    if (!user) {
      // Handle case where user is not found
      return res.status(404).send('User not found');
    }

    const { Fullname, email, password } = user;

    res.render('myprofile.ejs', { fname: Fullname, un: req.session.username, em: email, pass: password });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/myblogs', requireLogin, async (req, res) => {
  try {
    const username = req.session.username; 
    const userPosts = await Blog.find({ author: username });
    const totalPosts = userPosts.length; 

    res.render('myblogs.ejs', { name: username, blogPosts: userPosts , totalPosts: totalPosts});
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).send('Internal server error');
  }
});


app.get('/home', requireLogin, async(req, res) => {
  const blogPosts = await Blog.find().exec();
  const person= req.session.username;
  res.render("homepage.ejs", { name: person, blogPosts: blogPosts });;
});

app.get('/addblog', requireLogin, (req, res) => {
  res.render("addblog.ejs");
});

app.get('/signup', (req, res) => {
  res.render("signup.ejs");
});

app.get('/editpost', async (req, res) => {
  const blogPost = await Blog.findById(req.query.postId);
  res.render('editpost', { blogPost: blogPost });
});

app.post('/addblog', requireLogin, async (req, res) => {
  const { title, body } = req.body;
  const author = req.session.username; // Retrieve username from session
  try {
      const newPost = new Blog({
          Title: title,
          content: body,
          author,
      });
      await newPost.save();
      res.send('Blog post created successfully');
  } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).send('Failed to create blog post');
  }
});

app.post('/', async (req, res) => {
  console.log(req.body)
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).send({ error: 'Invalid username or password' });
    }
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '1h' });
    console.log(token)
    req.session.username = user.username;
    req.session.user = user; // Store user in session
    res.redirect('/home');
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send({ error: 'Login failed' });
  }
});

app.post('/signup', async (req, res) => {
  console.log(req.body);
  try {
    const { fullname, username, email, password } = req.body;
    // Validate input
    const validatedData = newUserSchema.parse({ Fullname: fullname, username, email, password });
    // Create new user
    const createdUser = await User.create(validatedData);
    res.send({ message: 'User created successfully', user: createdUser });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).send({ error: 'Signup failed' });
  }
});

app.post('/myprofile', async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;
    const updatedUser = await User.updateOne({ username }, { Fullname: fullname, email, password });

    if (updatedUser.nModified === 0) {
      return res.status(404).send({ error: 'User not found or no changes made' });
    }

    req.session.destroy(err => {
      if (err) {
        console.error('Error logging out:', err);
        res.status(500).send('Logout failed');
      } else {
        res.redirect('/');
      }
    });

    res.send({ message: 'User updated successfully please login again', user: updatedUser });
  } catch (error) {
    console.error('Error during profile update:', error);
    res.status(500).send({ error: 'Profile update failed' });
  }
});

app.post('/editpost', async (req, res) => {
  const blogPost = await Blog.findById(req.query.postId);
  blogPost.Title = req.body.title;
  blogPost.content = req.body.content;
  await blogPost.save();
  res.redirect('/home');  
});


app.post('/deletepost', async (req, res) => {
  try {
    const postId = req.body.postId; 
    await Blog.deleteOne({ _id: postId });

    res.send({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send('Internal server error');
  }
});


app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error logging out:', err);
      res.status(500).send('Logout failed');
    } else {
      res.redirect('/');
    }
  });
});

app.listen(port, () => {
  console.log(`TechSphere X is now online on port ${port}!`);
});
