const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const mysql = require('mysql');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const session = require('express-session');
const multer = require('multer');
const path = require('path');


app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: true
}));

const port = 1003;

// Set up middleware for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });




// Configure the multer middleware to handle file uploads

// Set up the view engine
app.set('view engine', 'ejs');

// Set up the static files directory
app.use(express.static('public'));

// Set up the body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

var db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "the-farm-buddy"
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to the database');
});





// Set up the home page
app.get('/', (req, res) => {
  res.render('home');
  
});
app.get('/info', (req, res) => {
  res.render('info');
  
});
app.get('/home', (req, res) => {
  res.render('home');
  
});
app.get('/media', (req, res) => {
  res.render('media');
  
});
app.get('/login', (req, res) => {
  res.render('login');
  
});
app.get('/docum', (req, res) => {
  res.render('documents');
  
});

app.get('/chat', (req, res) => {
  res.render('chat');
});

app.post('/signup', (req, res) => {
  const type = req.body.type;
  const first_name = req.body.first_name;
  const last_name = req.body.last_name;
  const email = req.body.email;
  const phone = req.body.phone;
  console.log(phone);
  const password = req.body.password;

  // Check if phone number already exists in database
  let checkQuery = 'SELECT * FROM users WHERE phone = ?';
  db.query(checkQuery, [phone], (err, result) => {
    if (err) {
      throw err;
    }

    if (result.length > 0) {
      // Phone number already exists, redirect back to signup page with error message
      res.render('login', { error: 'Phone number already exists' });
    } else {
      // Phone number is unique, insert new user into database
      let insertQuery = 'INSERT INTO users (type , first_name , last_name , email , phone , password) VALUES (?, ?, ?, ?, ? ,?)';
      db.query(insertQuery, [type , first_name , last_name , email , phone , password], (err, result) => {
        if (err) {
          throw err;
        }
       
        console.log("User successfully created");
        

        // Check user type and redirect to appropriate page
        if (type === 'normal') {
          // Create session and redirect to normal page
          let selectQuery = 'SELECT * FROM users WHERE phone = ?';
          db.query(selectQuery, [phone], (err, result) => {
            if (err) {
              throw err;
            }

            req.session.user = result[0];
            res.redirect('/normal');
            
          });
        } else if (type === 'dealer') {
          let selectQuery = 'SELECT * FROM users WHERE phone = ?';
          db.query(selectQuery, [phone], (err, result) => {
            if (err) {
              throw err;
            }

            req.session.user = result[0];
          // Redirect to dealer page
          res.redirect('/dealer');
          });
          
        } else {
          // Invalid user type, redirect back to signup page with error message
          res.render('signup', { error: 'Invalid user type' });
        }
      });
    }
  });
});



// Handle login form submission
app.post('/login', (req, res) => {
  const phone = req.body.number;
  const password = req.body.password2;

  let checkQuery = 'SELECT * FROM users WHERE phone = ?';
  db.query(checkQuery, [phone], (err, result) => {
    if (err) {
      throw err;
    }

    if (result.length === 0) {
      // User not found, redirect back to login page with error message
      res.render('login', { error: 'Phone number not found' });
    } else {
      // User found, check password
      const user = result[0];
      if (user.password === password) {
        // Passwords match, create session and redirect to home page
        req.session.user = user;
        
        if (user.type === 'normal') {
          res.redirect('/normal');
        } else if (user.type === 'dealer') {
          res.redirect('/dealer');
        };
      } else {
        // Passwords don't match, redirect back to login page with error message
        res.render('login', { error: 'Incorrect password' });
      }
    }
  });
});

// app.get('/normal', (req, res) => {
//   const user = req.session.user;
//   res.render('normal', { user });
  
// });
app.get('/normal', (req, res) => {
  const user = req.session.user;
  // Query the database for the user's profile
  const query = `SELECT city FROM profile WHERE phone = ${user.phone}`;
  db.query(query, (err, result) => {
    if (err) {
      res.render('normal', { user, error: 'Failed to fetch user profile' });
      return;
    }

    // Extract the city from the profile result, or use 'Delhi' as a default
    const city = result[0]?.city || 'Delhi';
    
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=d90ffe874f5f962f45fb58fc4056b9ee&units=metric`;
  // Replace YOUR_API_KEY with your own API key obtained from OpenWeatherMap

  request(url, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      const weatherData = JSON.parse(body);
      const weather = {
        temperature: Math.round(weatherData.main.temp),
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon
      };
      
      res.render('normal', { user , user_city:city , weather });
    } else {
      res.render('normal', { user , user_city:city, error: 'Failed to fetch weather data' });
    }
  });
});
});

app.get('/dealer', (req, res) => {
  const user = req.session.user;
  // Query the database for the user's profile
  const query = `SELECT city FROM profile WHERE phone = ${user.phone}`;
  db.query(query, (err, result) => {
    if (err) {
      res.render('normal', { user, error: 'Failed to fetch user profile' });
      return;
    }

    // Extract the city from the profile result, or use 'Delhi' as a default
    const city = result[0]?.city || 'Delhi';
    
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=d90ffe874f5f962f45fb58fc4056b9ee&units=metric`;
  // Replace YOUR_API_KEY with your own API key obtained from OpenWeatherMap

  request(url, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      const weatherData = JSON.parse(body);
      const weather = {
        temperature: Math.round(weatherData.main.temp),
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon
      };
      
      res.render('dealer', { user , user_city:city , weather });
    } else {
      res.render('dealer', { user , user_city:city  });
      console.log('Failed to fetch weather data');
    }
  });
});
});

app.get('/homedeal', (req, res) => {
  const user = req.session.user;
  res.redirect('/dealer');
  
});


app.get('/dprof', (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const userId = req.session.user.phone;
    // Check if the user has a profile
    let query = 'SELECT * FROM profile WHERE phone = ?';
    db.query(query, [userId], (err, result) => {
      if (err) {
        throw err;
      }
      if (result.length > 0) {
        // If the user has a profile, show profile data
        const profile = result[0];
        res.render('dprofile', { profile  });
      } else {
        // If the user does not have a ,profile, show user data
        query = 'SELECT * FROM users WHERE phone = ?';
        db.query(query, [userId], (err, result) => {
          if (err) {
            throw err;
          }
          const user = result[0];
          res.render('dprofile', { user });
        });
      }
    });
  }
});


app.post('/dprofile', (req, res) => {
 
    const userId = req.session.user.id;
    const firstName = req.body.first_name;
    const lastName = req.body.last_name;
    const phone = req.session.user.phone;
    const email = req.body.email;
    const password = req.body.password;
    // const profilePic = req.files.profilePic;

    const bio = req.body.bio;
    const houseNumber = req.body.house_number;
    const street = req.body.street;
    const city = req.body.city;
    const state = req.body.state;
    const country = req.body.country;
    const zipCode = req.body.zip_code;

    // Check if the user has a profile
    let query = 'SELECT * FROM profile WHERE phone = ?';
    console.log(phone);
    db.query(query, [phone], (err, result) => {
      if (err) {
        throw err;
      }
      
      

      // If the user has a profile, update it
      if (result.length > 0) {
        query = 'UPDATE profile SET user_id=?, first_name = ?, last_name = ?,phone=?,  email = ?, password = ?, bio = ?, house_number = ?, street = ?, city = ?, state = ?, country = ?, zip_code = ? WHERE phone = ?';
        const values = [userId, firstName, lastName,phone,  email, password, bio, houseNumber, street, city, state, country, zipCode, phone];
        // console.log(values);
        db.query(query, values, (err, result) => {
          if (err) {
            throw err;
          }
          console.log("Profile updated");
          res.redirect('/dprof');
        });
        query = 'UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ? WHERE phone = ?';
        const userValues = [firstName, lastName, email, password, phone];
        db.query(query, userValues, (err, result) => {
        if (err) {
          throw err;
        }
        console.log("User data updated");
        });
      } 
      // If the user does not have a profile, create it
      else {
        query = 'INSERT INTO profile (user_id, first_name, last_name, phone, email, password,  bio, house_number, street, city, state, country, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [userId, firstName, lastName, phone, email, password,  bio, houseNumber, street, city, state, country, zipCode];
        db.query(query, values, (err, result) => {
          if (err) {
            throw err;
          }
          console.log("Profile created");
          res.redirect('/dprof');
        });
        query = 'UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ? WHERE phone = ?';
        const userValues = [firstName, lastName, email, password, phone];
        db.query(query, userValues, (err, result) => {
        if (err) {
          throw err;
        }
        console.log("User data updated");
        });
      }
    });
  
});


app.get('/nprof', (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const userId = req.session.user.phone;
    // Check if the user has a profile
    let query = 'SELECT * FROM profile WHERE phone = ?';
    db.query(query, [userId], (err, result) => {
      if (err) {
        throw err;
      }
      if (result.length > 0) {
        // If the user has a profile, show profile data
        const profile = result[0];
        res.render('nprofile', { profile  });
      } else {
        // If the user does not have a ,profile, show user data
        query = 'SELECT * FROM users WHERE phone = ?';
        db.query(query, [userId], (err, result) => {
          if (err) {
            throw err;
          }
          const user = result[0];
          res.render('nprofile', { user });
        });
      }
    });
  }
});


app.post('/nprofile', (req, res) => {
 
    const userId = req.session.user.id;
    const firstName = req.body.first_name;
    const lastName = req.body.last_name;
    const phone = req.session.user.phone;
    const email = req.body.email;
    const password = req.body.password;
    // const profilePic = req.files.profilePic;

    const bio = req.body.bio;
    const houseNumber = req.body.house_number;
    const street = req.body.street;
    const city = req.body.city;
    const state = req.body.state;
    const country = req.body.country;
    const zipCode = req.body.zip_code;

    // Check if the user has a profile
    let query = 'SELECT * FROM profile WHERE phone = ?';
    console.log(phone);
    db.query(query, [phone], (err, result) => {
      if (err) {
        throw err;
      }
      
      

      // If the user has a profile, update it
      if (result.length > 0) {
        query = 'UPDATE profile SET user_id=?, first_name = ?, last_name = ?,phone=?,  email = ?, password = ?, bio = ?, house_number = ?, street = ?, city = ?, state = ?, country = ?, zip_code = ? WHERE phone = ?';
        const values = [userId, firstName, lastName,phone,  email, password, bio, houseNumber, street, city, state, country, zipCode, phone];
        console.log(values);
        db.query(query, values, (err, result) => {
          if (err) {
            throw err;
          }
          console.log("Profile updated");
          res.redirect('/nprof');
        });
        query = 'UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ? WHERE phone = ?';
        const userValues = [firstName, lastName, email, password, phone];
        db.query(query, userValues, (err, result) => {
        if (err) {
          throw err;
        }
        console.log("User data updated");
        });
      } 
      // If the user does not have a profile, create it
      else {
        query = 'INSERT INTO profile (user_id, first_name, last_name, phone, email, password,  bio, house_number, street, city, state, country, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [userId, firstName, lastName, phone, email, password,  bio, houseNumber, street, city, state, country, zipCode];
        db.query(query, values, (err, result) => {
          if (err) {
            throw err;
          }
          console.log("Profile created");
          res.redirect('/nprof');
        });
        query = 'UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ? WHERE phone = ?';
        const userValues = [firstName, lastName, email, password, phone];
        db.query(query, userValues, (err, result) => {
        if (err) {
          throw err;
        }
        console.log("User data updated");
        });
      }
    });
  
});


app.get('/products', (req, res) => {
  const user = req.session.user;
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }

  // Query the products for the logged in user
  const sql = 'SELECT * FROM products WHERE user_id = ?';
  db.query(sql, [req.session.user.id], (err, result) => {
    if (err) {
      console.error('Error retrieving products from database: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    
    // Render the upload page with the products data
    res.render('dprod', { user: req.session.user, products: result });
  });
  
  
});
app.post('/upload', upload.single('image'), (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }

  // Get product data from the request body
  const product = {
    name: req.body.name,
    price: req.body.price,
    image: req.file.filename
  };

  // const image = req.file ? `/images/${req.file.filename}` : null;

  // Insert product into the SQL database
  const sql = 'INSERT INTO products (name, price, image, user_id) VALUES (?, ?, ?, ?)';
  const values = [product.name, product.price, product.image, req.session.user.id];
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting product into database: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    console.log('Product inserted successfully');
    res.redirect('/products');
  });
});
app.get('/dorders', (req, res) => {
  const user = req.session.user;
  
  res.render('dorders',{user});
  
});

app.get('/norders', (req, res) => {
  const user = req.session.user;
  
  res.render('norders',{user});
  
});


app.get('/nconnections', (req, res) => {
   // check if the user is logged in
  // if not, redirect to the login page
  const sql = 'SELECT * FROM messages ORDER BY id DESC LIMIT 10';
  db.query(sql, (err, results) => {
    if (err) {
      throw err;
    }
    const messages = results.reverse();
    res.render('nconnections', { messages });
  });
  });

  

app.get('/dconnections', (req, res) => {
  const user = req.session.user;
  const sql = 'SELECT * FROM messages ORDER BY id DESC LIMIT 10';
  db.query(sql, (err, results) => {
    if (err) {
      throw err;
    }
    const messages = results.reverse();
    res.render('dconnections', { messages });
  });
 
  
});

app.get('/nhome', (req, res) => {
  const user = req.session.user;
  res.redirect('/normal');
  
});

app.get('/storepost',(req, res) => {
  res.redirect('/nconnections');
});







app.get('/store', (req, res) => {
  const user = req.session.user;

  const sql = 'SELECT * FROM products ';
  db.query(sql, (err, result) => {
    if (err) {
      throw err;
    }
    // const user = result[0];
    res.render('store', { products: result });
  });

 
  
});











app.get('/purchase', (req, res) => {
  // const { items } = req.body;
  const user = req.session.user;


  // // Insert the purchased items into the database
  // pool.getConnection((err, connection) => {
  //   if (err) {
  //     console.error(err);
  //     return res.status(500).send('Error connecting to database');
  //   }

  //   const values = items.map(item => [item.id, item.name, item.price]);
  //   const query = 'INSERT INTO orders (item_id, item_name, item_price) VALUES ?';

  //   connection.query(query, [values], (err, results) => {
  //     connection.release();

  //     if (err) {
  //       console.error(err);
  //       return res.status(500).send('Error inserting into database');
  //     }

      // Redirect to the orders page
      const items = req.body.items;
  
  // Insert cart items into the SQL database
  const sql = 'INSERT INTO cart_items (item_name, item_price) VALUES ?';
  const values = items.map((item) => [item.name, item.price]);
  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error('Error inserting cart items into database: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    console.log('Cart items inserted successfully');
    res.send('Cart items inserted successfully');
  });
      // res.redirect('/norders');
  //   });
  // });
});

// io.on('connection', (socket) => {
//   console.log('New socket connection');

//   // Get previous messages from the database
//   const sql = 'SELECT * FROM messages ORDER BY created_at ASC';
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     socket.emit('previousMessages', result);
//   });

//   // Handle new messages
//   socket.on('newMessage', (message) => {
//     const sql = 'INSERT INTO messages SET ?';
//     const values = { author: message.author, content: message.content };
//     db.query(sql, values, (err, result) => {
//       if (err) throw err;
//       socket.broadcast.emit('updateMessages', message);
//     });
//   });
// });
// io.on('connection', (socket) => {

//   const generateMessage = (username, text) => {
//     return {
//         username,
//         text,
//         createdAt: new Date().getTime()
//     }
// }

// const generateLocationMessage = (username, url) => {
//     return {
//         username,
//         url,
//         createdAt: new Date().getTime()
//     }
// }
// const users = []

// const addUser = ({ id, username, room }) => {
//     // Clean the data
//     username = username.trim().toLowerCase()
//     room = room.trim().toLowerCase()

//     // Validate the data
//     if (!username || !room) {
//         return {
//             error: 'Username and room are required!'
//         }
//     }

//     // Check for existing user
//     const existingUser = users.find((user) => {
//         return user.room === room && user.username === username
//     })

//     // Validate username
//     if (existingUser) {
//         return {
//             error: 'Username is in use!'
//         }
//     }

//     // Store user
//     const user = { id, username, room }
//     users.push(user)
//     return { user }
// }

// const removeUser = (id) => {
//     const index = users.findIndex((user) => user.id === id)

//     if (index !== -1) {
//         return users.splice(index, 1)[0]
//     }
// }

// const getUser = (id) => {
//     return users.find((user) => user.id === id)
// }

// const getUsersInRoom = (room) => {
//     room = room.trim().toLowerCase()
//     return users.filter((user) => user.room === room)
// }
//   console.log('New WebSocket connection')

//   socket.on('join', (options, callback) => {
//       const { error, user } = addUser({ id: socket.id, ...options })

//       if (error) {
//           return callback(error)
//       }

//       socket.join(user.room)

//       socket.emit('message', generateMessage('Admin', 'Welcome!'))
//       socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
//       io.to(user.room).emit('roomData', {
//           room: user.room,
//           users: getUsersInRoom(user.room)
//       })

//       callback()
//   })

//   socket.on('sendMessage', (message, callback) => {
//       const user = getUser(socket.id)
//       const filter = new Filter()

//       if (filter.isProfane(message)) {
//           return callback('Profanity is not allowed!')
//       }

//       io.to(user.room).emit('message', generateMessage(user.username, message))
//       callback()
//   })

//   socket.on('sendLocation', (coords, callback) => {
//       const user = getUser(socket.id)
//       io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
//       callback()
//   })

//   socket.on('disconnect', () => {
//       const user = removeUser(socket.id)

//       if (user) {
//           io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
//           io.to(user.room).emit('roomData', {
//               room: user.room,
//               users: getUsersInRoom(user.room)
//           })
//       }
//   })
// })

io.on('connection', (socket) => {
  console.log('New WebSocket connection');

  // Listen for new messages
  socket.on('message', (message) => {
    // Save the message to the database
    const sql = 'INSERT INTO messages SET ?';
    const values = { text: message };
    db.query(sql, values, (err, result) => {
      if (err) {
        throw err;
      }
      console.log('Message saved to database:', message);
    });

    // Broadcast the message to all connected clients
    io.emit('message', message);
  });

  // Load previous messages from the database
  const sql = 'SELECT * FROM messages ORDER BY id DESC LIMIT 10';
  db.query(sql, (err, results) => {
    if (err) {
      throw err;
    }
    results.reverse().forEach((row) => {
      socket.emit('message', row.text);
    });
  });
});






app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      throw err;
    }
    res.redirect('/home');
  });
});

// Start the server
http.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

