# 🍳 CookingSecrets - AI-Powered Mobile Recipe App

A comprehensive React Native mobile application featuring AI recipe generation, social features, marketplace, wallet system, and complete moderation/admin panels.

## 🚀 Quick Start

### Prerequisites
The app requires API keys for full functionality. Please configure the following:

### 📋 Required API Keys

Edit `/app/backend/.env` and add your keys:

```env
# Required for AI Recipe Generation
OPENAI_API_KEY="your-openai-api-key-here"

# Required for Payment Features
STRIPE_SECRET_KEY="your-stripe-test-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-test-publishable-key"
```

**Where to get these keys:**
- **OpenAI**: https://platform.openai.com/api-keys
- **Stripe (TEST MODE)**: https://dashboard.stripe.com/test/apikeys

**Note**: The app gracefully handles missing keys by showing appropriate messages. Features requiring these keys will be disabled until configured.

---

## ✨ Features

### 👤 User Roles & Authentication
- **Guest**: Generate 1 free AI recipe (session-based limit)
- **User**: Unlimited recipe generation, save to cookbook, social features
- **Chef**: All user features + create/sell paid recipes
- **Moderator**: Review and manage reported content
- **Admin**: Full control, user management, create moderators

### 🤖 AI Recipe Generation
- Real OpenAI GPT integration
- Enter ingredients → Get complete recipe
- Strict JSON validation
- Guest limit enforcement

### 📚 Cookbook
- Save favorite recipes
- Beautiful book-style UI
- Swipe navigation ready

### 🏪 Marketplace
- Chefs sell premium recipes
- Wallet-based purchases
- Real payment flow (Stripe sandbox)

### 💰 Wallet System
- Balance management
- Purchase tracking
- Transaction history
- Chef earnings

### 💬 Social Features
- Like recipes
- Comment on recipes
- Follow functionality (backend ready)

### 🛡️ Moderation & Safety
- User-reported content
- Moderator review panel
- Escalation to admin
- Ban system

### 👑 Admin Panel
- Create moderators
- Manage all users
- Role management
- Ban/unban users
- View escalated reports

---

## 🎨 Design System

### Glassmorphism UI
- **Color Palette**: Blueberry blues (#5B7FFF, #8BA4FF, #3D5FDD)
- **Effect**: Apple-style glass cards with blur
- **Animation**: Smooth transitions and micro-interactions
- **Theme**: Dark mode with frosted glass overlays

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: React Native 0.79
- **Routing**: Expo Router (file-based)
- **State**: React Context + AsyncStorage
- **HTTP**: Axios
- **UI**: Custom glassmorphic components
- **Animations**: Linear Gradient, Blur Effects

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB with Motor (async)
- **Auth**: JWT with role-based access control
- **AI**: OpenAI GPT-3.5
- **Payments**: Stripe (sandbox mode)
- **Security**: Bcrypt password hashing

---

## 🧪 Testing the App

### 1. Create Admin Account (First Time)
You'll need to manually create the first admin user in MongoDB:

```javascript
// Connect to MongoDB and run:
db.users.insertOne({
  email: "admin@cookingsecrets.com",
  password: "$2b$12$...", // Use bcrypt to hash a password
  name: "Admin",
  role: "admin",
  wallet_balance: 0,
  banned: false,
  created_at: new Date()
})
```

Or signup as a regular user and manually change the role in MongoDB:
```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

---

## 🚨 Important Notes

### Security
- ✅ All passwords hashed with bcrypt
- ✅ JWT tokens with expiration
- ✅ Role-based endpoint protection
- ✅ Guest session tracking
- ✅ API keys in environment variables

### Payment Mode
- ⚠️ **STRIPE IS IN TEST MODE**
- ⚠️ Use Stripe test cards only
- ⚠️ No real money will be charged

### AI Generation
- Requires OPENAI_API_KEY
- Uses GPT-3.5-turbo model
- Strict JSON output validation
- Error handling for API failures

---

Built with ❤️ using React Native, FastAPI, and modern mobile development practices.
