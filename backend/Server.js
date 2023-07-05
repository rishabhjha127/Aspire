const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = express();
const PORT = 3001;

// Middleware to parse incoming request body as JSON
app.use(bodyParser.json());


// Connect to MongoDB
mongoose.connect('mongodb+srv://rishabhjha127:abcd@cluster0.vs7mwnu.mongodb.net/', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

	.then(() => {
		console.log('Connected to MongoDB');
	})
	.catch((error) => {
		console.error('Error connecting to MongoDB:', error.message);
	});


// Define a Mongoose schema for users
const userSchema = new mongoose.Schema({
	username: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	collegeName: { type: String, required: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	otp: { type: String, required: true },
	verified: { type: Boolean, default: false },
});

// Create a Mongoose model based on the schema
const User = mongoose.model('User', userSchema);

const passwordResetSchema = new mongoose.Schema({
	email: { type: String, required: true },
	otp: { type: String, required: true },
	expiresAt: { type: Date, required: true },
});

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);





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

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'rishabh.jha127@gmail.com', // Replace with your Gmail email address
		pass: 'cjggxatcglqjfyxi', // Replace with your Gmail password
	},
});

// Register endpoint
app.post('/register', async (req, res) => {
	try {
		const { username, password, confirmPassword, email, collegeName, firstName, lastName } = req.body;

		// Basic input validation
		if (!username || !password || !confirmPassword || !email || !collegeName || !firstName || !lastName) {
			return res.status(400).json({ error: 'All fields are required.' });
		}

		// Check if the username already exists in the database
		const existingUser = await User.findOne({ username });
		if (existingUser) {
			return res.status(409).json({ error: 'Username already exists.' });
		}

		// Check if the email already exists in the database
		const existingEmailUser = await User.findOne({ email });
		if (existingEmailUser) {
			return res.status(409).json({ error: 'Email already exists.' });
		}

		// Check if the password and confirmPassword match
		if (password !== confirmPassword) {
			return res.status(400).json({ error: 'Passwords do not match.' });
		}

		// Generate OTP
		const otp = generateOTP();

		// Create a new user in the database
		const newUser = new User({
			username,
			password,
			email,
			collegeName,
			firstName,
			lastName,
			otp,
		});

		await newUser.save();

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
	} catch (error) {
		console.error('Error registering user:', error);
		return res.status(500).json({ error: 'Failed to register user.' });
	}
});








// Load user data from the JSON file on server start

// Start the server

// Login endpoint
app.post('/login', (req, res) => {
	const { username, password } = req.body;

	// Find the user with the given username in the database
	User.findOne({ username })
		.then((user) => {
			// Check if the user exists and the password matches
			if (!user || user.password !== password) {
				return res.status(401).json({ error: 'Invalid username or password.' });
			}

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
		})
		.catch((error) => {
			console.error('Error during login:', error);
			return res.status(500).json({ error: 'Failed to login.' });
		});
});
app.post("/verify", (req, res) => {
	const { email, otp } = req.body;

	// Find the user with the provided email address in the database
	User.findOne({ email })
		.then((user) => {
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}

			// Check if the provided OTP matches the user's OTP
			if (otp !== user.otp) {
				return res.status(401).json({ message: "Invalid OTP" });
			}

			// Set the user as verified in the database
			user.verified = true;

			// Save the updated user data to the database
			return user.save();
		})
		.then(() => {
			console.log("User verified successfully.");
			return res.status(200).json({ message: "User verified successfully" });
		})
		.catch((error) => {
			console.error('Error during verification:', error);
			return res.status(500).json({ error: 'Failed to verify user.' });
		});
});

// Forgot Password endpoint
app.post('/forgotpassword', async (req, res) => {
	try {
		const { email } = req.body;

		// Check if the email exists in the database
		const existingUser = await User.findOne({ email });
		if (!existingUser) {
			return res.status(404).json({ error: 'User not found.' });
		}

		// Generate OTP and set its expiration time (e.g., 10 minutes from now)
		const otp = generateOTP();

		// Save the generated OTP to the existing user in the database
		existingUser.otp = otp;
		await existingUser.save();

		// Send email with the OTP
		const mailOptions = {
			from: 'rishabh.jha127@gmail.com', // Replace with your Gmail email address
			to: email,
			subject: 'OTP for Password Reset',
			text: `Your OTP for password reset is: ${otp}`,
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.error('Error sending OTP email:', error);
				return res.status(500).json({ error: 'Failed to send OTP email.' });
			}
			console.log('OTP email sent:', info.response);
			return res.status(200).json({ message: 'OTP sent successfully. Please check your email.' });
		});
	} catch (error) {
		console.error('Error sending OTP:', error);
		return res.status(500).json({ error: 'Failed to send OTP.' });
	}
});

app.put("/resetpassword", (req, res) => {
  const { email, otp, newPassword, confirmNewPassword } = req.body;

  // Find the user with the provided email address
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "User not found"+user.otp + otp});
      }

      // Check if the provided OTP matches the user's OTP
      if (otp !== user.otp) {
        return res.status(401).json({ message: "Invalid OTP" });
      }

      // Check if the new password and confirm new password match
      if (newPassword !== confirmNewPassword) {
        return res
          .status(400)
          .json({ message: "New password and confirm password do not match" });
      }

      // Set the new password for the user
      user.password = newPassword;

      // Save the updated user to the database
      user
        .save()
        .then(() => {
          console.log("Password reset successfully for user:", user);
          return res
            .status(200)
            .json({ message: "Password reset successfully" });
        })
        .catch((error) => {
          console.log("Error updating user:", error);
          return res.status(500).json({ message: "Error resetting password" });
        });
    })
    .catch((error) => {
      console.log("Error finding user:", error);
      return res.status(500).json({ message: "Error resetting password" });
    });
});







// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
app.get('/', (req, res) => {
	res.send('Welcome to the User Registration and Login API.');
});