const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const jwt = require('jsonwebtoken');


const app = express();
const PORT = 3000;

// Middleware to parse incoming request body as JSON
app.use(bodyParser.json());


// Sample array to store registered users (in-memory storage)
let users = [];


// Generate a random alphanumeric OTP
function generateOTP() {
	const length = 25;
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let otp = '';
	for (let i = 0; i < length; i++) {
		otp += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return otp;
}
function saveUserDataToFile(users) {
  fs.writeFile('users.json', JSON.stringify(users), (err) => {
    if (err) {
      console.error('Error saving user data:', err);
    } else {
      console.log('User data saved successfully.');
    }
  });
}

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'rishabh.jha127@gmail.com', // Replace with your Gmail email address
		pass: 'cjggxatcglqjfyxi', // Replace with your Gmail password
	},
});

// Register endpoint
app.post('/register', (req, res) => {
	const { username, password, confirmPassword, email, collegeName, firstName, lastName } = req.body;

	// Basic input validation
	if (!username || !password || !confirmPassword || !email || !collegeName || !firstName || !lastName) {
		return res.status(400).json({ error: 'All fields are required.' });
	}

	// Check if the username already exists
	if (users.find((user) => user.username === username)) {
		return res.status(409).json({ error: 'Username already exists.' });
	}

	// Check if the email already exists
	if (users.find((user) => user.email === email)) {
		return res.status(409).json({ error: 'Email already exists.' });
	}

	// Check if the password and confirmPassword match
	if (password !== confirmPassword) {
		return res.status(400).json({ error: 'Passwords do not match.' });
	}

	// Generate OTP
	const otp = generateOTP();

	// Store the user in the in-memory array (for demo purposes only)
	users.push({ username, email, password, collegeName, firstName, lastName, otp });
	saveUserDataToFile(users);

	

	// Send email with the OTP
	const mailOptions = {
		from: 'rishabh.jha127@gmail.com', // Replace with your Gmail email address
		to: email,
		subject: 'OTP for Registration',
		text: `Your OTP for registration is: ${otp}`,
	};

	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.error('Error sending OTP email:', error);
			return res.status(500).json({ error: 'Failed to send OTP email.' });
		}
		console.log('OTP email sent:', info.response);
		return res.status(201).json({ message: 'Registration successful! Please check your email for OTP.' });
	});
});

// Save user data to a JSON file
function saveUserDataToFile(users) {
	fs.writeFile('users.json', JSON.stringify(users), (err) => {
		if (err) {
			console.error('Error saving user data:', err);
		} else {
			console.log('User data saved successfully.');
		}
	});
}

// Load user data from the JSON file
// Load user data from the JSON file
function loadUserDataFromFile() {
	try {
		// Check if the file exists
		if (!fs.existsSync('users.json')) {
			console.log('No user data found. Creating a new file.');
			return [];
		}

		const data = fs.readFileSync('users.json','utf8');
		return JSON.parse(data);
	} catch (err) {
		console.error('Error loading user data:', err);
		return [];
	}
}


// Load user data from the JSON file on server start

// Start the server

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Find the user with the given username
  const user = users.find((u) => u.username === username);

  // Check if the user exists and the password matches
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }else{
	//return res.status(200).json({message: 'hello world' });

	// If login is successful, create a JWT token with the user data as the payload
	const payload = {
		username: user.username,
		email: user.email,
		collegeName: user.collegeName,
		firstName: user.firstName,
		lastName: user.lastName,
	};
	const secretKey = 'your-secret-key'; // Replace this with your own secret key
	const token = jwt.sign(payload, secretKey);

	// Return the JWT token to the user
	return res.json({ token });
}
});

app.post("/verify", (req, res) => {
  const { email, otp } = req.body;

  // Find the user with the provided email address
  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if the provided OTP matches the user's OTP
  if (otp !== user.otp) {
    return res.status(401).json({ message: "Invalid OTP" });
  }

  // Set the user as verified
  user.verified = true;

  // Write data to the JSON file
  saveUserDataToFile(users);

  console.log("User verified successfully:");
  console.log(user);
  return res.status(200).json({ message: "User verified successfully" });
});

// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
app.get('/', (req, res) => {
  res.send('Welcome to the User Registration and Login API.');
});