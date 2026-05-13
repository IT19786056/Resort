🌴 Azure Horizon | Premium Resort Booking App

A sophisticated, full-stack resort booking platform designed to provide users with a seamless vacation planning experience. From browsing luxury villas to secure payment processing, Azure Horizon brings the resort experience to your fingertips.

✨ Key Features

🔍 Smart Search & Filtering: Find resorts by location, price range, amenities, and guest capacity.

📅 Real-time Availability: Integrated calendar system to check room availability instantly.

👤 User Dashboard: Manage bookings, view stay history, and update profile settings.

💳 Secure Payments: Integrated Stripe/PayPal processing for safe transactions.

📱 Fully Responsive: Optimized for desktop, tablet, and mobile devices.

🌟 Review System: Verified guests can leave ratings and feedback for their stays.

🛠 Admin Panel: Comprehensive dashboard for resort owners to manage inventory and view analytics.

🚀 Tech Stack

| Category | Technology Used |
| Frontend | React.js, Tailwind CSS, Framer Motion, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | MongoDB (with Mongoose) |
| Auth | JSON Web Tokens (JWT) & Google OAuth |
| State | Redux Toolkit / React Context API |
| Payments | Stripe API |

📸 Screenshots

🛠 Installation & Setup

Follow these steps to get a local copy up and running:

1. Prerequisites

Node.js (v16.0.0 or higher)

npm or yarn

MongoDB Atlas account

2. Clone the repository

git clone [https://github.com/yourusername/resort-booking-app.git](https://github.com/yourusername/resort-booking-app.git)
cd resort-booking-app



3. Install Dependencies

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install



4. Environment Variables

Create a .env file in the server directory and add the following:

PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
STRIPE_SECRET_KEY=your_stripe_key



5. Run the Application

# From the root directory
npm run dev



📂 Project Structure

├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # View components
│   │   ├── store/         # State management
│   │   └── assets/        # Images and styles
├── server/                # Express backend
│   ├── controllers/       # Route logic
│   ├── models/            # Database schemas
│   ├── routes/            # API endpoints
│   └── middleware/        # Auth & error handling
└── README.md



🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

📄 License

Distributed under the MIT License. See LICENSE for more information.

📧 Contact

Your Name - @your_twitter - email@example.com

Project Link: https://github.com/yourusername/resort-booking-app
