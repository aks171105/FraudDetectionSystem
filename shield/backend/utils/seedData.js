const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

// Helper functions to generate random data
function getRandomAmount(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Data pools for generating realistic transactions
const locations = [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
    "Fort Worth", "Columbus", "San Francisco", "Charlotte", "Indianapolis", "Seattle",
    "Denver", "Boston", "Las Vegas", "Portland", "Oklahoma City", "Detroit", "Memphis"
];

const merchants = [
    "Walmart", "Target", "Amazon", "Best Buy", "Costco", "Home Depot", "Kroger",
    "CVS Pharmacy", "Walgreens", "Apple Store", "McDonald's", "Starbucks", "Shell",
    "ExxonMobil", "7-Eleven", "Subway", "Nike", "Adidas", "Microsoft Store", "GameStop"
];

const categories = ["purchase", "transfer", "withdrawal", "deposit"];

const descriptions = {
    purchase: [
        "Grocery shopping at", "Electronics from", "Clothing purchase at",
        "Household items from", "Food delivery from", "Gas station purchase at",
        "Online shopping at", "Restaurant bill at", "Pharmacy purchase at",
        "Subscription payment to"
    ],
    transfer: [
        "Bank transfer to", "Money sent to", "Payment to", "Transfer for rent to",
        "Utility payment to", "Insurance payment to", "Investment transfer to",
        "Loan payment to", "Salary transfer from", "Service payment to"
    ],
    withdrawal: [
        "ATM withdrawal at", "Cash withdrawal from", "Bank withdrawal at"
    ],
    deposit: [
        "Salary deposit from", "Check deposit at", "Direct deposit from",
        "Investment return from", "Refund from", "Interest credit from"
    ]
};

// Generate 2000 transactions
function generateTransactions() {
    const transactions = [];
    const numAccounts = 200; // Number of unique accounts
    const startDate = new Date(2024, 0, 1); // Start from January 1, 2024
    const endDate = new Date(); // Current date

    // Generate account IDs
    const accountIds = Array.from({ length: numAccounts }, (_, i) => 
        `ACC${String(i + 1).padStart(6, '0')}`
    );

    // Function to generate IP address
    const generateIP = () => {
        return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
    };

    // Generate normal transactions (80% of total)
    for (let i = 0; i < 1600; i++) {
        const category = getRandomElement(categories);
        const accountId = getRandomElement(accountIds);
        const location = getRandomElement(locations);
        const merchant = getRandomElement(merchants);
        const descriptionTemplate = getRandomElement(descriptions[category]);

        transactions.push({
            accountId,
            amount: getRandomAmount(10, 2000), // Normal transaction range
            description: `${descriptionTemplate} ${merchant}`,
            category,
            location,
            ipAddress: generateIP(),
            timestamp: getRandomDate(startDate, endDate)
        });
    }

    // Generate potentially fraudulent transactions (20% of total)
    for (let i = 0; i < 400; i++) {
        const fraudType = Math.floor(Math.random() * 5); // 5 types of fraud patterns
        const accountId = getRandomElement(accountIds);
        
        switch (fraudType) {
            case 0: // High-value transactions
                transactions.push({
                    accountId,
                    amount: getRandomAmount(10000, 50000),
                    description: getRandomElement([
                        "Large electronics purchase",
                        "Luxury item purchase",
                        "High-value transfer",
                        "Premium service payment"
                    ]),
                    category: "purchase",
                    location: getRandomElement(locations),
                    ipAddress: generateIP(),
                    timestamp: getRandomDate(startDate, endDate)
                });
                break;

            case 1: // Suspicious keywords
                transactions.push({
                    accountId,
                    amount: getRandomAmount(1000, 8000),
                    description: getRandomElement([
                        "Urgent crypto investment opportunity",
                        "Emergency BTC transfer required",
                        "Quick cash advance needed",
                        "Urgent wire transfer request"
                    ]),
                    category: "transfer",
                    location: getRandomElement(locations),
                    ipAddress: generateIP(),
                    timestamp: getRandomDate(startDate, endDate)
                });
                break;

            case 2: // Multiple quick transactions
                const baseTime = getRandomDate(startDate, endDate);
                for (let j = 0; j < 3; j++) {
                    transactions.push({
                        accountId,
                        amount: getRandomAmount(1000, 5000),
                        description: `Quick Transfer ${j + 1}`,
                        category: "transfer",
                        location: getRandomElement(locations),
                        ipAddress: generateIP(),
                        timestamp: new Date(baseTime.getTime() + j * 2 * 60 * 1000) // 2 minutes apart
                    });
                }
                break;

            case 3: // Location anomalies
                const baseTime2 = getRandomDate(startDate, endDate);
                const locations2 = getRandomElement(locations);
                let differentLocation;
                do {
                    differentLocation = getRandomElement(locations);
                } while (differentLocation === locations2);

                transactions.push({
                    accountId,
                    amount: getRandomAmount(100, 1000),
                    description: "Purchase at local store",
                    category: "purchase",
                    location: locations2,
                    ipAddress: generateIP(),
                    timestamp: baseTime2
                });

                transactions.push({
                    accountId,
                    amount: getRandomAmount(100, 1000),
                    description: "Online purchase",
                    category: "purchase",
                    location: differentLocation,
                    ipAddress: generateIP(),
                    timestamp: new Date(baseTime2.getTime() + 30 * 60 * 1000) // 30 minutes later
                });
                break;

            case 4: // Circular transactions
                const baseTime3 = getRandomDate(startDate, endDate);
                const amount = getRandomAmount(3000, 7000);
                const accounts = [accountId];
                
                // Generate two more random accounts for the circle
                for (let j = 0; j < 2; j++) {
                    let newAccount;
                    do {
                        newAccount = getRandomElement(accountIds);
                    } while (accounts.includes(newAccount));
                    accounts.push(newAccount);
                }

                // Create circular transactions
                for (let j = 0; j < 3; j++) {
                    transactions.push({
                        accountId: accounts[j],
                        amount: amount,
                        description: `Transfer to ${accounts[(j + 1) % 3]}`,
                        category: "transfer",
                        location: getRandomElement(locations),
                        ipAddress: generateIP(),
                        timestamp: new Date(baseTime3.getTime() + j * 5 * 60 * 1000) // 5 minutes apart
                    });
                }
                break;
        }
    }

    // Sort transactions by timestamp
    return transactions.sort((a, b) => a.timestamp - b.timestamp);
}

// Function to seed the database
async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/fraudDetection', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Clear existing transactions
        await Transaction.deleteMany({});
        console.log('Cleared existing transactions');

        // Generate and insert transactions
        const transactions = generateTransactions();
        console.log(`Generated ${transactions.length} transactions`);

        // Insert in batches of 100 to avoid overwhelming the database
        const batchSize = 100;
        for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            await Transaction.insertMany(batch);
            console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactions.length / batchSize)}`);
        }

        console.log('Database seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

// Run the seeding function
seedDatabase(); 