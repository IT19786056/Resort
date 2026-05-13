<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure Horizon | Premium Resort Booking App</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; scroll-behavior: smooth; }
        .code-block { background-color: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 0.5rem; font-family: monospace; overflow-x: auto; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900">

    <!-- Navigation -->
    <nav class="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div class="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center space-x-2">
                <span class="text-2xl">🌴</span>
                <span class="font-bold text-xl tracking-tight text-blue-600">Azure Horizon</span>
            </div>
            <div class="hidden md:flex space-x-6 text-sm font-medium text-slate-600">
                <a href="#features" class="hover:text-blue-600 transition">Features</a>
                <a href="#tech" class="hover:text-blue-600 transition">Tech Stack</a>
                <a href="#setup" class="hover:text-blue-600 transition">Setup</a>
                <a href="#contact" class="hover:text-blue-600 transition">Contact</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h1 class="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6">
            Azure Horizon | <span class="text-blue-600">Premium Resort Booking App</span>
        </h1>
        <p class="text-xl text-slate-600 max-w-2xl leading-relaxed">
            A sophisticated, full-stack resort booking platform designed to provide users with a seamless vacation planning experience. From browsing luxury villas to secure payment processing.
        </p>
        <div class="mt-10 flex flex-wrap gap-4">
            <a href="https://github.com/yourusername/resort-booking-app" class="bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition flex items-center">
                <i class="fab fa-github mr-2"></i> View on GitHub
            </a>
            <button class="border border-slate-300 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition">
                Live Demo
            </button>
        </div>
    </header>

    <!-- Features -->
    <section id="features" class="bg-white py-20 border-y border-slate-200">
        <div class="max-w-5xl mx-auto px-6">
            <h2 class="text-3xl font-bold mb-12 flex items-center">
                <span class="mr-3 text-2xl">✨</span> Key Features
            </h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Feature Card -->
                <div class="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-blue-600 mb-4 text-2xl"><i class="fas fa-search text-xl mr-2"></i></div>
                    <h3 class="font-bold text-lg mb-2">Smart Search & Filtering</h3>
                    <p class="text-slate-600 text-sm">Find resorts by location, price range, amenities, and guest capacity with ease.</p>
                </div>
                <div class="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-blue-600 mb-4 text-2xl"><i class="fas fa-calendar-alt text-xl mr-2"></i></div>
                    <h3 class="font-bold text-lg mb-2">Real-time Availability</h3>
                    <p class="text-slate-600 text-sm">Integrated calendar system to check room availability instantly for your dates.</p>
                </div>
                <div class="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-blue-600 mb-4 text-2xl"><i class="fas fa-user-circle text-xl mr-2"></i></div>
                    <h3 class="font-bold text-lg mb-2">User Dashboard</h3>
                    <p class="text-slate-600 text-sm">Manage bookings, view stay history, and update profile settings in one place.</p>
                </div>
                <div class="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-blue-600 mb-4 text-2xl"><i class="fas fa-credit-card text-xl mr-2"></i></div>
                    <h3 class="font-bold text-lg mb-2">Secure Payments</h3>
                    <p class="text-slate-600 text-sm">Integrated Stripe/PayPal processing for safe and encrypted transactions.</p>
                </div>
                <div class="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-blue-600 mb-4 text-2xl"><i class="fas fa-mobile-alt text-xl mr-2"></i></div>
                    <h3 class="font-bold text-lg mb-2">Fully Responsive</h3>
                    <p class="text-slate-600 text-sm">Optimized for desktop, tablet, and mobile devices using Tailwind CSS.</p>
                </div>
                <div class="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-blue-600 mb-4 text-2xl"><i class="fas fa-tools text-xl mr-2"></i></div>
                    <h3 class="font-bold text-lg mb-2">Admin Panel</h3>
                    <p class="text-slate-600 text-sm">Comprehensive dashboard for resort owners to manage inventory and view analytics.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Tech Stack -->
    <section id="tech" class="py-20">
        <div class="max-w-5xl mx-auto px-6">
            <h2 class="text-3xl font-bold mb-10 flex items-center">
                <span class="mr-3 text-2xl">🚀</span> Tech Stack
            </h2>
            <div class="overflow-hidden rounded-xl border border-slate-200">
                <table class="w-full text-left">
                    <thead class="bg-slate-100 border-b border-slate-200">
                        <tr>
                            <th class="px-6 py-4 font-bold">Category</th>
                            <th class="px-6 py-4 font-bold">Technology Used</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 bg-white">
                        <tr>
                            <td class="px-6 py-4 font-semibold text-slate-700">Frontend</td>
                            <td class="px-6 py-4">React.js, Tailwind CSS, Framer Motion, Lucide Icons</td>
                        </tr>
                        <tr>
                            <td class="px-6 py-4 font-semibold text-slate-700">Backend</td>
                            <td class="px-6 py-4">Node.js, Express.js</td>
                        </tr>
                        <tr>
                            <td class="px-6 py-4 font-semibold text-slate-700">Database</td>
                            <td class="px-6 py-4">MongoDB (with Mongoose)</td>
                        </tr>
                        <tr>
                            <td class="px-6 py-4 font-semibold text-slate-700">Auth</td>
                            <td class="px-6 py-4">JSON Web Tokens (JWT) & Google OAuth</td>
                        </tr>
                        <tr>
                            <td class="px-6 py-4 font-semibold text-slate-700">State</td>
                            <td class="px-6 py-4">Redux Toolkit / React Context API</td>
                        </tr>
                        <tr>
                            <td class="px-6 py-4 font-semibold text-slate-700">Payments</td>
                            <td class="px-6 py-4">Stripe API</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <!-- Setup -->
    <section id="setup" class="bg-slate-900 text-white py-20">
        <div class="max-w-5xl mx-auto px-6">
            <h2 class="text-3xl font-bold mb-10 flex items-center">
                <span class="mr-3 text-2xl text-blue-400">🛠</span> Installation & Setup
            </h2>
            
            <div class="space-y-12">
                <div>
                    <h3 class="text-xl font-semibold mb-4 text-blue-400">1. Prerequisites</h3>
                    <ul class="list-disc list-inside space-y-2 text-slate-300">
                        <li>Node.js (v16.0.0 or higher)</li>
                        <li>npm or yarn</li>
                        <li>MongoDB Atlas account</li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-xl font-semibold mb-4 text-blue-400">2. Clone & Install</h3>
                    <p class="mb-4 text-slate-300">Get a local copy up and running:</p>
                    <div class="code-block">
                        git clone https://github.com/yourusername/resort-booking-app.git<br>
                        cd resort-booking-app<br><br>
                        # Install frontend<br>
                        cd client && npm install<br><br>
                        # Install backend<br>
                        cd ../server && npm install
                    </div>
                </div>

                <div>
                    <h3 class="text-xl font-semibold mb-4 text-blue-400">3. Environment Variables</h3>
                    <p class="mb-4 text-slate-300">Create a <code>.env</code> file in the server directory:</p>
                    <div class="code-block">
                        PORT=5000<br>
                        MONGO_URI=your_mongodb_uri<br>
                        JWT_SECRET=your_secret_key<br>
                        STRIPE_SECRET_KEY=your_stripe_key
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer id="contact" class="bg-white border-t border-slate-200 py-16">
        <div class="max-w-5xl mx-auto px-6 text-center">
            <h2 class="text-2xl font-bold mb-4">Interested in the project?</h2>
            <p class="text-slate-600 mb-8">Feel free to reach out for collaboration or questions.</p>
            <div class="flex justify-center space-x-6">
                <a href="https://twitter.com/your_twitter" class="text-slate-400 hover:text-blue-400 text-2xl transition"><i class="fab fa-twitter"></i></a>
                <a href="mailto:email@example.com" class="text-slate-400 hover:text-red-500 text-2xl transition"><i class="fas fa-envelope"></i></a>
                <a href="https://github.com/yourusername" class="text-slate-400 hover:text-slate-900 text-2xl transition"><i class="fab fa-github"></i></a>
            </div>
            <div class="mt-12 text-sm text-slate-400">
                Distributed under the MIT License.
            </div>
        </div>
    </footer>

</body>
</html>
