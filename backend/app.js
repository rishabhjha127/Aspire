const express = require('express');
const app = express();
const port = 3001; // Change this to your desired port number

const fs = require('fs');
const randomstring = require('randomstring');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Route for user registration
app.post('/register', (req, res) => {
  const { username, password, confirmPassword, email, college, firstName, lastName } = req.body;

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  // In a real-world scenario, use a proper database like MongoDB to store user data
  // For demonstration purposes, we'll save the data to a JSON file
  const userData = {
    username,
    email,
    password,
    college,
    firstName,
    lastName,
  };

  fs.readFile('users.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading from file:', err);
      return res.status(500).json({ error: 'Failed to register user' });
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    // Check if the username or email already exists
    if (users.some((user) => user.username === username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Generate an OTP (25-digit alphanumeric)
    const otp = randomstring.generate({ length: 25, charset: 'alphanumeric' });

    // Add the OTP to the user data
    userData.otp = otp;

    // Push the user data to the users array
    users.push(userData);

    // Save the updated users array to the JSON file
    fs.writeFile('users.json', JSON.stringify(users), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        return res.status(500).json({ error: 'Failed to register user' });
      }

      // You can add the email sending functionality here
      // ... (code to send OTP via email)

      console.log('User data saved to file.');
      return res.status(200).json({ message: 'User registered successfully' });
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
// Route for the root URL (http://localhost:3001)
app.get('/', (req, res) => {
  res.send('Welcome to the backend project!');
});

